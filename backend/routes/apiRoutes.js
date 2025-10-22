import express from "express";
import dbPromise from "../db.js";
import jwt from "jsonwebtoken";
import { getVendors, getPoCodes, getSkuByCode } from "../controllers/apiController.js";
import { saveDeletedRto, getDeletedRtos, restoreDeletedRto, finalDeleteDeletedRto } from "../controllers/deletedRtoController.js";
import { authorize } from "./authRoutes.js";

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

// Get submitted RTO data - only for superadmin
router.get("/rto/overview", authorize(['superadmin']), async (req, res) => {
  let db;
  try {
    db = await dbPromise;
    const result = await db.query("SELECT created_by FROM rto_submissions");
    const rows = Array.isArray(result) ? result[0] : result;

    if (!Array.isArray(rows)) {
      return res.status(500).json({ success: false, message: "Unexpected DB response format" });
    }

    const countMap = {};
    rows.forEach(row => {
      countMap[row.created_by] = (countMap[row.created_by] || 0) + 1;
    });

    const labels = Object.keys(countMap);
    const counts = Object.values(countMap);
    const totalUsers = labels.length;
    const totalRTOs = rows.length;

    res.json({ success: true, labels, counts, totalUsers, totalRTOs });
  } catch (error) {
    console.error("Error fetching RTO overview:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET RTO submissions with role-based filtering - Phase 2 Working
router.get("/rto", authorize(['user','admin','superadmin']), async (req, res) => {
  let db;
  try {
    db = await dbPromise;

    let query = "SELECT * FROM rto_submissions ORDER BY id DESC";
    let params = [];

    if (req.user.role === 'user') {
      // Only return rows created by this user's email
      query = "SELECT * FROM rto_submissions WHERE created_by = ? ORDER BY id DESC";
      params = [req.user.email];
    } else if (req.user.role === 'admin') {
      // Admin can see all rows; optionally filter if you have assigned admins
      query = "SELECT * FROM rto_submissions ORDER BY id DESC";
    } else if (req.user.role === 'superadmin') {
      // Superadmin sees everything
      query = "SELECT * FROM rto_submissions ORDER BY id DESC";
    }

    const [rows] = await db.query(query, params);
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

// Update RTO data - Phase 1
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

// -----Deleted RTOs Page-------- //

// Get Deleted RTOs Data for Deleted RTOs Page
router.get("/deleted-rtos", getDeletedRtos);

// Delete Part 2 - Send Record to Deleted RTOs table to Deleted RTOs Page from Submitted RTOs
router.post("/deleted-rtos", saveDeletedRto);

// Delete Part 2 - Delete from Submitted RTO data  
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

// Restore Deleted RTOs Data to Submitted RTOs
router.post("/deleted-rtos/restore/:id", restoreDeletedRto);

// Delete Part 3 - Final Delete from Deleted RTOs Page
router.delete("/deleted-rtos/:id", finalDeleteDeletedRto);

export default router;
