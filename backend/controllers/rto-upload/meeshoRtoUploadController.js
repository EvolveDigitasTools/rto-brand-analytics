import Busboy from "busboy";
import * as csv from "fast-csv";
import Excel from "exceljs";
import path from "path";
import db from "../../db.js"; 

const tableName = "meesho_rto_data";
const BATCH_SIZE = 200;

const headerToColumn = {
  "S No": "s_no",
  "Product Name": "product_name",
  "SKU": "sku",
  "Variation": "variation",
  "Meesho PID": "meesho_pid",
  "Category": "category",
  "Qty": "qty",
  "Order Number": "order_number",
  "Suborder Number": "suborder_number",
  "Dispatch Date": "dispatch_date",
  "Return Created Date": "return_created_date",
  "Type of Return": "type_of_return",
  "Sub Type": "sub_type",
  "Delivered Date": "delivered_date",
  "Courier Partner": "courier_partner",
  "AWB Number": "awb_number",
  "Tracking Link": "tracking_link",
  "Proof of Delivery": "proof_of_delivery",
  "Return Price Type": "return_price_type",
  "Return Reason": "return_reason",
  "Detailed Return Reason": "detailed_return_reason",
  "OTP verified at": "otp_verified_at",
};

const columns = [
  "s_no","product_name","sku","variation","meesho_pid","category","qty",
  "order_number","suborder_number","dispatch_date","return_created_date",
  "type_of_return","sub_type","delivered_date","courier_partner","awb_number",
  "tracking_link","proof_of_delivery","return_price_type","return_reason",
  "detailed_return_reason","otp_verified_at",
];

function sseWrite(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

const cap = (v, n) => {
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

function toPlainDigitString(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "na") return null;

  if (/^\d+$/.test(s)) return s;

  if (typeof v === "number" && Number.isFinite(v)) {
    return v.toLocaleString("fullwide", { useGrouping: false });
  }

  const sci = s.match(/^(\d+)(?:\.(\d+))?e\+?(\d+)$/i);
  if (sci) {
    const intPart = sci[1];
    const frac = sci[2] || "";
    const exp = parseInt(sci[3], 10);
    const digits = (intPart + frac).replace(/^0+/, "") || "0";
    const zeros = Math.max(0, exp - frac.length);
    return digits + "0".repeat(zeros);
  }

  const onlyDigits = s.replace(/\D+/g, "");
  return onlyDigits.length ? onlyDigits : null;
}

function parsePossibleDate(v) {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v)) return v;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "na") return null;

  // ISO-ish
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

  // dd-mm-yyyy HH:MM[:SS]
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const [, dd, mm, yyyy, HH, MM, SS] = m;
    const y = Number(yyyy.length === 2 ? `20${yyyy}` : yyyy);
    const d = new Date(y, Number(mm) - 1, Number(dd), Number(HH), Number(MM), Number(SS || 0));
    return isNaN(d) ? null : d;
  }

  return null;
}

function sqlDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function sqlDateTime(d) {
  return `${sqlDate(d)} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

function normalizeRowByHeader(row) {
  const obj = {};
  for (const [header, dbCol] of Object.entries(headerToColumn)) {
    obj[dbCol] = row?.[header] ?? null;
  }

  // caps to match schema
  obj.product_name       = cap(obj.product_name, 255);
  obj.sku                = cap(obj.sku, 100);
  obj.variation          = cap(obj.variation, 255);
  obj.meesho_pid         = cap(obj.meesho_pid, 100);
  obj.category           = cap(obj.category, 150);
  obj.type_of_return     = cap(obj.type_of_return, 100);
  obj.sub_type           = cap(obj.sub_type, 100);
  obj.courier_partner    = cap(obj.courier_partner, 150);
  obj.return_price_type  = cap(obj.return_price_type, 100);
  obj.return_reason      = cap(obj.return_reason, 255);
  // large text: tracking_link, proof_of_delivery, detailed_return_reason => keep raw or null
  obj.tracking_link         = cap(obj.tracking_link, 2000); // optional cap to be safe
  obj.proof_of_delivery     = cap(obj.proof_of_delivery, 2000);
  // numeric-like
  obj.s_no = toInt(obj.s_no);
  obj.qty  = toInt(obj.qty);

  // IDs that can come as scientific notation
  obj.order_number     = toPlainDigitString(obj.order_number);
  obj.suborder_number  = cap(obj.suborder_number, 100); // has underscore often; keep as text
  obj.awb_number       = toPlainDigitString(obj.awb_number); // UNIQUE key

  // dates
  obj.dispatch_date        = parsePossibleDate(obj.dispatch_date);
  obj.return_created_date  = parsePossibleDate(obj.return_created_date);
  obj.delivered_date       = parsePossibleDate(obj.delivered_date);
  obj.otp_verified_at      = parsePossibleDate(obj.otp_verified_at);

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
        values.push(col === "otp_verified_at" ? sqlDateTime(v) : sqlDate(v));
      } else {
        values.push(v);
      }
    }
  }

  try {
    // using pool directly (no manual get/release needed)
    const [result] = await db.query(sql, values);
    return { inserted: result?.affectedRows || 0 };
  } catch (err) {
    const e = new Error(err.message);
    e.code = err.code;
    e.sqlMessage = err.sqlMessage;
    e.sqlState = err.sqlState;
    throw e;
  }
}

export async function uploadMeeshoSSE(req, res) {
  // SSE headers
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
      sseWrite(res, "error", {
        message: "DB insert failed during final flush",
        code: e.code || null,
        sqlState: e.sqlState || null,
        detail: e.sqlMessage || e.message,
      });
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

      parser.on("headers", (h) => {
        sseWrite(res, "progress", { message: "CSV headers detected", headers: h });
      });

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
    // XLSX (exceljs supports .xlsx, not .xls)
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
        let headersEmitted = false;

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
            if (!headersEmitted) {
              sseWrite(res, "progress", { message: "XLSX headers detected", headers });
              headersEmitted = true;
            }
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

        worksheet.on("finished", () => {});
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
  busboy.on("finish", () => { /* completion handled by parser events */ });

  req.pipe(busboy);
}
