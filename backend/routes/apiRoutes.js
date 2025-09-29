import express from "express";
import dbPromise from "../db.js";
import jwt from "jsonwebtoken";
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

// Get submitted RTO data - Phase 1 working
router.get("/rto", async (req, res) => {
  let db;
  try {
    db = await dbPromise
    const [rows] = await db.query("SELECT * FROM rto_submissions ORDER BY id DESC");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching RTO data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Submit RTO data - Phase 1 working
router.post("/rto", async (req, res) => {
  let db;
  try {
    db = await dbPromise

    const { pickupPartner, returnDate, fields } = req.body;

    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    let created_by;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      created_by = decoded.email;
    } catch (err) {
      return res.status(403).json({ success: false, message: "Invalid token" });
    }

    // Log request body for debugging
    console.log("Request Body:", req.body);

    if (!pickupPartner || !returnDate || !fields || fields.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    // Validate returnDate format
    const parsedReturnDate = new Date(returnDate);
    if (isNaN(parsedReturnDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid return_date format" });
    }

    const insertQueries = fields.map((field) => {
      // Validate orderDate format
      const parsedOrderDate = field.orderDate ? new Date(field.orderDate) : null;
      if (field.orderDate && isNaN(parsedOrderDate.getTime())) {
        console.warn(`Invalid order_date for field: ${JSON.stringify(field)}`);
        return res.status(400).json({ success: false, message: `Invalid order_date for SKU: ${field.skuCode}` });
      }

      return [
        pickupPartner,
        parsedReturnDate,
        field.skuCode || null,
        field.productTitle || null,
        field.awbId || null,
        field.orderId || null,
        parsedOrderDate,
        field.courier || null,
        field.itemCondition || null,
        field.claimRaised || null,
        field.ticketId || null,
        field.returnQty || 1,
        field.comments || null,
        new Date(),
        created_by
      ];
    });

    // Log insert queries for debugging
    console.log("Insert Queries:", insertQueries);

    const sql = `
      INSERT INTO rto_submissions 
      (
        pickup_partner, 
        return_date, 
        sku_code, 
        product_title, 
        awb_id, 
        order_id, 
        order_date, 
        courier, 
        item_condition, 
        claim_raised, 
        ticket_id, 
        return_qty, 
        comments, 
        created_at, 
        created_by
      )
      VALUES ?
    `;

    await db.query(sql, [insertQueries]);

    res.json({ success: true, message: "RTO data saved successfully" });
  } catch (error) {
    console.error("Error inserting RTO data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delete RTO data - Phase 1 testing
router.delete("/rto/:id", async (req, res) => {
  try {
    const db = await dbPromise;
    const { id } = req.params;
    await db.query("DELETE FROM rto_submissions WHERE id = ?", [id]);
    res.json({ success: true, message: "RTO deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update RTO data
router.put("/rto/:id", async (req, res) => {
  try {
    const db = await dbPromise;
    const { id } = req.params;

    const {
      pickup_partner = null,
      return_date = null,
      sku_code = null,
      product_title = null,
      awb_id = null,
      order_id = null,
      order_date = null,
      courier = null,
      item_condition = null,
      claim_raised = null,
      ticket_id = null,
      comments = null,
      return_qty = 1,
    } = req.body;

    console.log("PUT /rto/:id body:", req.body);

    // Convert date strings to YYYY-MM-DD format
    // ✅ Validate return_date
    let parsedReturnDate = null;
    if (return_date) {
      const d = new Date(return_date);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid return_date format" });
      }
      parsedReturnDate = d.toISOString().split("T")[0];
    }

    // ✅ Validate order_date
    let parsedOrderDate = null;
    if (order_date) {
      const d = new Date(order_date);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid order_date format" });
      }
      parsedOrderDate = d.toISOString().split("T")[0];
    }

    const sql = `
      UPDATE rto_submissions SET
        pickup_partner=?,
        return_date=?,
        sku_code=?,
        product_title=?,
        awb_id=?,
        order_id=?,
        order_date=?,
        courier=?,
        item_condition=?,
        claim_raised=?,
        ticket_id=?,
        comments=?,
        return_qty=?
      WHERE id=?
    `;

    await db.query(sql, [
      pickup_partner,
      parsedReturnDate,
      sku_code,
      product_title,
      awb_id,
      order_id,
      parsedOrderDate,
      courier,
      item_condition,
      claim_raised,
      ticket_id,
      comments,
      return_qty,
      id,
    ]);

    res.json({ success: true, message: "RTO updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



export default router;
