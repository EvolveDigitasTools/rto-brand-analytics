import Busboy from "busboy";
import * as csv from "fast-csv";
import Excel from "exceljs";
import path from "path";
import db from "../../db.js";

const tableName = "flipkart_rto_data";
const BATCH_SIZE = 200;

// Map Excel headers → DB column names
const headerToColumn = {
  "Location ID": "location_id",
  "Order ID": "order_id",
  "Order Item ID": "order_item_id",
  "Return ID": "return_id",
  "Tracking ID": "tracking_id", // unique
  "Shipment ID": "shipment_id",
  "Replacement Order Item ID": "replacement_order_item_id",
  "SKU": "sku",
  "FSN": "fsn",
  "Product": "product",
  "Total Price": "total_price",
  "Quantity": "quantity",
  "FF Type": "ff_type",
  "Return Requested Date": "return_requested_date",
  "Return Approval Date": "return_approval_date",
  "Completed Date": "completed_date",
  "Out For Delivery Date": "out_for_delivery_date",
  "Return Delivery Promise Date": "return_delivery_promise_date",
  "Picked Up Date": "picked_up_date",
  "Shipment Type": "shipment_type",
  "Return Status": "return_status",
  "Completion Status": "completion_status",
  "Return Type": "return_type",
  "Return Reason": "return_reason",
  "Return Sub-reason": "return_sub_reason",
  "Comments": "comments",
  "Vendor Name": "vendor_name",
  "Location Name": "location_name",
};

const columns = Object.values(headerToColumn);

function sseWrite(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

const cap = (v, n = 255) => {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "na") return null;
  return s.slice(0, n);
};

const toInt = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "na") return null;
  const num = Number(s.replace(/[^\d-]/g, ""));
  return Number.isFinite(num) ? num : null;
};

function parsePossibleDate(v) {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v)) return v;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "na") return null;

  // ISO-like
  const d1 = new Date(s);
  if (!isNaN(d1)) return d1;

  // dd/mm/yyyy or dd-mm-yyyy
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    const y = Number(yyyy.length === 2 ? `20${yyyy}` : yyyy);
    const d = new Date(y, Number(mm) - 1, Number(dd));
    return isNaN(d) ? null : d;
  }

  return null;
}

function sqlDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function normalizeRowByHeader(row) {
  const obj = {};
  for (const [header, dbCol] of Object.entries(headerToColumn)) {
    obj[dbCol] = row?.[header] ?? null;
  }

  // Clean text
  obj.location_id = cap(obj.location_id, 100);
  obj.order_id = cap(obj.order_id, 100);
  obj.order_item_id = cap(obj.order_item_id, 100);
  obj.return_id = cap(obj.return_id, 100);
  obj.tracking_id = cap(obj.tracking_id, 100); // unique
  obj.shipment_id = cap(obj.shipment_id, 100);
  obj.replacement_order_item_id = cap(obj.replacement_order_item_id, 100);
  obj.sku = cap(obj.sku, 100);
  obj.fsn = cap(obj.fsn, 100);
  obj.product = cap(obj.product, 255);
  obj.total_price = toInt(obj.total_price);
  obj.quantity = toInt(obj.quantity);
  obj.ff_type = cap(obj.ff_type, 100);
  obj.return_requested_date = parsePossibleDate(obj.return_requested_date);
  obj.return_approval_date = parsePossibleDate(obj.return_approval_date);
  obj.completed_date = parsePossibleDate(obj.completed_date);
  obj.out_for_delivery_date = parsePossibleDate(obj.out_for_delivery_date);
  obj.return_delivery_promise_date = parsePossibleDate(obj.return_delivery_promise_date);
  obj.picked_up_date = parsePossibleDate(obj.picked_up_date);
  obj.shipment_type = cap(obj.shipment_type, 100);
  obj.return_status = cap(obj.return_status, 100);
  obj.completion_status = cap(obj.completion_status, 100);
  obj.return_type = cap(obj.return_type, 100);
  obj.return_reason = cap(obj.return_reason, 255);
  obj.return_sub_reason = cap(obj.return_sub_reason, 255);
  obj.comments = cap(obj.comments, 500);
  obj.vendor_name = cap(obj.vendor_name, 150);
  obj.location_name = cap(obj.location_name, 150);

  return obj;
}

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
        values.push(sqlDate(v));
      } else {
        values.push(v);
      }
    }
  }

  const [result] = await db.query(sql, values);
  return { inserted: result?.affectedRows || 0 };
}

export async function uploadFlipkartSSE(req, res) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const busboy = Busboy({ headers: req.headers, limits: { files: 1 } });
  let processed = 0,
    inserted = 0,
    duplicates = 0,
    doneCalled = false;
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
      sseWrite(res, ok ? "done" : "error", ok ? { processed, inserted, duplicates } : { message: err?.message });
    } catch (e) {
      sseWrite(res, "error", { message: e.message });
    }
    res.end();
  };

  busboy.on("file", (fieldname, fileStream, info) => {
    const { filename } = info || {};
    const ext = path.extname(filename || "").toLowerCase();

    if (ext === ".csv") {
      const parser = csv.parse({ headers: true, trim: true, ignoreEmpty: true });
      parser.on("headers", (h) => sseWrite(res, "progress", { message: "CSV headers detected", headers: h }));
      parser.on("data", async (row) => {
        processed++;
        batch.push(normalizeRowByHeader(row));
        if (batch.length >= BATCH_SIZE) {
          parser.pause();
          try {
            await flushIfNeeded();
          } finally {
            parser.resume();
          }
        }
      });
      parser.on("error", (err) => finish(false, err));
      parser.on("end", () => finish(true));
      fileStream.pipe(parser);
    } else if (ext === ".xlsx") {
      const workbookReader = new Excel.stream.xlsx.WorkbookReader(fileStream, {
        entries: "emit",
        sharedStrings: "cache",
        worksheets: "emit",
        hyperlinks: "ignore",
        styles: "ignore",
      });

      workbookReader.on("worksheet", (worksheet) => {
        let headerIndexMap = null;
        worksheet.on("row", async (row) => {
          if (!headerIndexMap) {
            const headers = [];
            for (let i = 1; i <= row.cellCount; i++) {
              const cell = row.getCell(i).value;
              const v = typeof cell === "object" && cell?.text ? cell.text : cell;
              headers.push(v != null ? String(v).trim() : "");
            }
            headerIndexMap = {};
            headers.forEach((h, idx) => (headerIndexMap[h] = idx));
            sseWrite(res, "progress", { message: "XLSX headers detected", headers });
            return;
          }

          const obj = {};
          for (const [h, idx] of Object.entries(headerIndexMap)) {
            const cell = row.getCell((idx ?? 0) + 1).value;
            obj[h] = typeof cell === "object" && cell?.text ? cell.text : cell ?? null;
          }

          processed++;
          batch.push(normalizeRowByHeader(obj));
          if (batch.length >= BATCH_SIZE) {
            worksheet.pause();
            try {
              await flushIfNeeded();
            } finally {
              worksheet.resume();
            }
          }
        });
      });

      workbookReader.on("end", () => finish(true));
      workbookReader.on("error", (err) => finish(false, err));
    } else {
      sseWrite(res, "error", { message: "Unsupported file type. Use .csv or .xlsx" });
      fileStream.resume();
    }
  });

  busboy.on("error", (err) => finish(false, err));
  req.pipe(busboy);
}
