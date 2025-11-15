import Busboy from "busboy";
import * as csv from "fast-csv";
import Excel from "exceljs";
import path from "path";
import db from "../../db.js";

const tableName = "amazon_rto_data";
const BATCH_SIZE = 200;

// 🔹 Amazon header → DB column mapping
const headerToColumn = {
  "Order ID": "order_id",
  "Order date": "order_date",
  "Return request date": "return_request_date",
  "Return request status": "return_request_status",
  "Amazon RMA ID": "amazon_rma_id",
  "Seller RMA ID": "seller_rma_id",
  "Label type": "label_type",
  "Label cost": "label_cost",
  "Currency code": "currency_code",
  "Return carrier": "return_carrier",
  "Tracking ID": "tracking_id",
  "Label to be paid by": "label_paid_by",
  "A-to-z claim": "a_to_z_claim",
  "Is prime": "is_prime",
  "ASIN": "asin",
  "Merchant SKU": "merchant_sku",
  "Item Name": "item_name",
  "Return quantity": "return_quantity",
  "Return reason": "return_reason",
  "In policy": "in_policy",
  "Return type": "return_type",
  "Resolution": "resolution",
  "Invoice number": "invoice_number",
  "Return delivery date": "return_delivery_date",
  "Order Amount": "order_amount",
  "Order quantity": "order_quantity",
  "SafeT Action reason": "safet_action_reason",
  "SafeT claim ID": "safet_claim_id",
  "SafeT claim state": "safet_claim_state",
  "SafeT claim creation time": "safet_claim_creation_time",
  "SafeT claim reimbursement amount": "safet_claim_reimbursement_amount",
  "Refunded Amount": "refunded_amount",
  "Category": "category",
  "Order Item ID": "order_item_id",
};

const columns = Object.values(headerToColumn);

// 🔹 Utility helpers (same as in Meesho)
const cap = (v, n) => {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "na") return null;
  return s.slice(0, n);
};

const toFloat = (v) => {
  if (v == null) return null;
  const s = String(v).trim().replace(/[^\d.-]/g, "");
  const num = parseFloat(s);
  return isNaN(num) ? null : num;
};

function parsePossibleDate(v) {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v)) return v;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "na") return null;

  const d1 = new Date(s);
  if (!isNaN(d1)) return d1;

  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    const y = Number(yyyy.length === 2 ? `20${yyyy}` : yyyy);
    const d = new Date(y, Number(mm) - 1, Number(dd));
    return isNaN(d) ? null : d;
  }

  return null;
}

function sqlDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sqlDateTime(d) {
  return `${sqlDate(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

// 🔹 Normalize a row before inserting
function normalizeRowByHeader(row) {
  const obj = {};
  for (const [header, dbCol] of Object.entries(headerToColumn)) {
    obj[dbCol] = row?.[header] ?? null;
  }

  obj.order_id = cap(obj.order_id, 100);
  obj.amazon_rma_id = cap(obj.amazon_rma_id, 100);
  obj.seller_rma_id = cap(obj.seller_rma_id, 100);
  obj.merchant_sku = cap(obj.merchant_sku, 100);
  obj.item_name = cap(obj.item_name, 255);
  obj.return_reason = cap(obj.return_reason, 255);
  obj.resolution = cap(obj.resolution, 100);
  obj.category = cap(obj.category, 150);

  obj.order_date = parsePossibleDate(obj.order_date);
  obj.return_request_date = parsePossibleDate(obj.return_request_date);
  obj.return_delivery_date = parsePossibleDate(obj.return_delivery_date);
  obj.safet_claim_creation_time = parsePossibleDate(obj.safet_claim_creation_time);

  obj.order_amount = toFloat(obj.order_amount);
  obj.label_cost = toFloat(obj.label_cost);
  obj.refunded_amount = toFloat(obj.refunded_amount);
  obj.safet_claim_reimbursement_amount = toFloat(obj.safet_claim_reimbursement_amount);
  obj.return_quantity = parseInt(obj.return_quantity || 0);
  obj.order_quantity = parseInt(obj.order_quantity || 0);

  return obj;
}

// 🔹 Insert in batches
async function insertBatch(rows) {
  if (!rows.length) return { inserted: 0 };
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `
    INSERT IGNORE INTO ${tableName}
    (${columns.join(", ")})
    VALUES ${rows.map(() => `(${placeholders})`).join(", ")}
  `;

  const values = [];
  for (const r of rows) {
    for (const col of columns) {
      const v = r[col] ?? null;
      if (v instanceof Date) {
        values.push(col.includes("time") ? sqlDateTime(v) : sqlDate(v));
      } else {
        values.push(v);
      }
    }
  }

  const [result] = await db.query(sql, values);
  return { inserted: result?.affectedRows || 0 };
}

// 🔹 SSE writer
function sseWrite(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// 🔹 Main upload handler
export async function uploadAmazonSSE(req, res) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const busboy = Busboy({ headers: req.headers, limits: { files: 1 } });

  let processed = 0;
  let inserted = 0;
  let duplicates = 0;
  let doneCalled = false;
  const batch = [];

  async function flushIfNeeded(force = false) {
    if (batch.length >= BATCH_SIZE || (force && batch.length)) {
      const toInsert = batch.splice(0, batch.length);
      const { inserted: justInserted } = await insertBatch(toInsert);
      const justDuplicates = toInsert.length - justInserted;

      inserted += justInserted;
      duplicates += justDuplicates;

      sseWrite(res, "progress", { processed, inserted, duplicates });
    }
  }

  const finish = async (ok, err) => {
    if (doneCalled) return;
    doneCalled = true;
    try {
      await flushIfNeeded(true);
    } catch (e) {
      sseWrite(res, "error", { message: "DB insert failed", detail: e.message });
      return res.end();
    }

    if (ok) {
      sseWrite(res, "done", { processed, inserted, duplicates });
    } else {
      sseWrite(res, "error", { message: err?.message || "Unknown error" });
    }
    res.end();
  };

  busboy.on("file", (fieldname, fileStream, info) => {
    const { filename } = info || {};
    const ext = path.extname(filename || "").toLowerCase();

    // CSV
    if (ext === ".csv") {
      const parser = csv.parse({ headers: true, trim: true, ignoreEmpty: true });
      parser.on("data", async (row) => {
        processed++;
        batch.push(normalizeRowByHeader(row));
        if (batch.length >= BATCH_SIZE) {
          parser.pause();
          try { await flushIfNeeded(); } finally { parser.resume(); }
        }
      });
      parser.on("error", (err) => finish(false, err));
      parser.on("end", () => finish(true));
      fileStream.pipe(parser);
    }

    // XLSX
    else if (ext === ".xlsx") {
      const workbookReader = new Excel.stream.xlsx.WorkbookReader(fileStream, {
        entries: "emit",
        sharedStrings: "cache",
        worksheets: "emit",
        hyperlinks: "ignore",
        styles: "ignore",
        formulas: "ignore",
      });

      workbookReader.on("worksheet", (worksheet) => {
        let headerIndexMap = null;
        worksheet.on("row", async (row) => {
          if (!headerIndexMap) {
            const headers = [];
            for (let i = 1; i <= row.cellCount; i++) {
              const cell = row.getCell(i).value;
              const v = (cell && typeof cell === "object" && cell.text) ? cell.text : cell;
              headers.push(v != null ? String(v).trim() : "");
            }
            headerIndexMap = {};
            headers.forEach((h, idx) => { headerIndexMap[h] = idx; });
            sseWrite(res, "progress", { message: "Headers detected", headers });
            return;
          }

          const obj = {};
          for (const [h, idx] of Object.entries(headerIndexMap)) {
            const cell = row.getCell((idx ?? 0) + 1).value;
            obj[h] = (cell && typeof cell === "object" && cell.text) ? cell.text : cell ?? null;
          }

          processed++;
          batch.push(normalizeRowByHeader(obj));
          if (batch.length >= BATCH_SIZE) {
            worksheet.pause();
            try { await flushIfNeeded(); } finally { worksheet.resume(); }
          }
        });
      });

      workbookReader.on("end", () => finish(true));
      workbookReader.on("error", (err) => finish(false, err));
    }

    else {
      sseWrite(res, "error", { message: "Unsupported file type. Use .csv or .xlsx" });
      fileStream.resume();
    }
  });

  busboy.on("error", (err) => finish(false, err));
  req.pipe(busboy);
}
