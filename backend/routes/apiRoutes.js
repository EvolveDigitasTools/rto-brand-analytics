import express from "express";
import dbPromise from "../db.js";
import { getVendors, getPoCodes, getSkuByCode } from "../controllers/apiController.js";

const router = express.Router();

// Get submitted RTO data - Phase 1 workuing
// router.get("/rto", async (req, res) => {
//   try {
//     const [rows] = await db.query("SELECT * FROM rto_submissions ORDER BY created_at DESC");
//     res.json({ success: true, data: rows });
//   } catch (error) {
//     console.error("Error fetching RTO data:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });



// Submit RTO data
router.post("/rto", async (req, res) => {
  try {
    const { pickupPartner, returnDate, fields } = req.body;

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
        new Date(), // Set created_at to current timestamp
      ];
    });

    // Log insert queries for debugging
    console.log("Insert Queries:", insertQueries);

    const sql = `
      INSERT INTO rto_submissions 
      (pickup_partner, return_date, sku_code, product_title, awb_id, order_id, order_date, courier, item_condition, claim_raised, ticket_id, return_qty, comments, created_at)
      VALUES ?
    `;

    await db.query(sql, [insertQueries]);

    res.json({ success: true, message: "RTO data saved successfully" });
  } catch (error) {
    console.error("Error inserting RTO data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get submitted RTO data - Phase 2 testing
// router.get("/rto", async (req, res) => {
//   try {
//     const [rows] = await db.query(`
//       SELECT 
//         id,
//         pickup_partner,
//         sku_code,
//         product_title,
//         awb_id,
//         order_id,
//         courier,
//         item_condition,
//         claim_raised,
//         ticket_id,
//         comments,
//         return_qty,
//         DATE_FORMAT(order_date, '%d %b %Y %H:%i') AS order_date,
//         DATE_FORMAT(return_date, '%d %b %Y %H:%i') AS return_date,
//         DATE_FORMAT(created_at, '%d %b %Y %H:%i') AS created_at
//       FROM rto_table
//       ORDER BY created_at DESC
//     `);

//     res.json({ success: true, data: rows });
//   } catch (error) {
//     console.error("Error fetching RTO data:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// Route with type param for flexibility
router.get("/rto", async (req, res) => {
  let db;
  try {
    // Wait for database connection
    db = await dbPromise;

    const [rows] = await db.query(`
      SELECT 
        id,
        pickup_partner,
        sku_code,
        product_title,
        awb_id,
        order_id,
        courier,
        item_condition,
        claim_raised,
        ticket_id,
        comments,
        return_qty,
        order_date,
        return_date,
        created_at
      FROM rto_submissions
      ORDER BY created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching RTO data:", {
      message: error.message,
      sqlMessage: error.sqlMessage,
      code: error.code,
    });
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
      sqlError: error.sqlMessage || "No SQL message available",
    });
  }
});


export default router;
