import express from "express";
import db from "../db.js";
import { getVendors, getPoCodes, getSkuByCode } from "../controllers/apiController.js";

const router = express.Router();

// Route with type param for flexibility
router.get("/", async (req, res) => {
  const { type } = req.query;

  switch (type) {
    case "vendors":
      return getVendors(req, res);
    case "po-codes":
      return getPoCodes(req, res);
    case "skuCode":
      return getSkuByCode(req, res);
    default:  
      return res.status(400).json({ message: "Invalid type parameter" });
  }
});

// Submit RTO data
router.post("/rto", async (req, res) => {
  try {
    const { pickupPartner, returnDate, fields } = req.body;

    if (!pickupPartner || !returnDate || !fields || fields.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    const insertQueries = fields.map((field) => [
      pickupPartner,
      returnDate,
      field.skuCode || null,
      field.productTitle || null,
      field.awbId || null,
      field.orderId || null,
      field.orderDate ? new Date(field.orderDate) : null, // convert to proper date
      field.courier || null,
      field.itemCondition || null,
      field.claimRaised || null, // ENUM: Yes/No or null
      field.ticketId || null,
      field.returnQty || 1,
      field.comments || null, // ensure empty strings are converted to null
    ]);

    const sql = `
      INSERT INTO rto_submissions 
      (pickup_partner, return_date, sku_code, product_title, awb_id, order_id, order_date, courier, item_condition, claim_raised, ticket_id, return_qty, comments)
      VALUES ?
    `;

    await db.query(sql, [insertQueries]);

    res.json({ success: true, message: "RTO data saved successfully" });
  } catch (error) {
    console.error("Error inserting RTO data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get submitted RTO data
router.get("/rto", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM rto_submissions ORDER BY created_at DESC");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching RTO data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


export default router;
