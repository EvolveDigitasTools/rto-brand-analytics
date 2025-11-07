import dbPromise from "../db.js";
import jwt from "jsonwebtoken";

export const saveDeletedRto = async (req, res) => {
  let db;
  try {
    db = await dbPromise;

    const {
      awb_id,
      sku_code,
      product_title,
      order_id,
      marketplaces,
      pickup_partner,
      return_date,
      order_date,
      item_condition,
      claim_raised,
      ticket_id,
      comments,
      return_qty,
      created_at,
      created_by
    } = req.body;

    // 🟢 Token validation (same as /rto)
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    let deleted_by;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      deleted_by = decoded.email;
    } catch (err) {
      return res.status(403).json({ success: false, message: "Invalid token" });
    }

    // 🗓 Date formatting (YYYY-MM-DD)
    const formatDate = (date) => {
      if (!date) return null;
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().split("T")[0];
    };

    // 2 Date formatting (YYYY-MM-DD HH:mm)
    const formatDateTime = (dateString) => {
      if (!dateString) return null;
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().slice(0, 16);
    };

    const formattedReturnDate = formatDate(return_date);
    const formattedOrderDate = formatDate(order_date);
    const formattedCreatedAt = formatDateTime(created_at);
    const deleted_at = new Date();

    if (!formattedReturnDate) {
      return res.status(400).json({ success: false, message: "Invalid return_date format" });
    }

    // ✅ Save to deleted_rtos
    const sql = `
      INSERT INTO deleted_rtos (
        awb_id, sku_code, product_title, order_id, marketplaces, pickup_partner,
        return_date, order_date, item_condition, claim_raised, ticket_id,
        comments, return_qty, created_at, created_by, deleted_at, deleted_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    await db.query(sql, [
      awb_id || null,
      sku_code || null,
      product_title || null,
      order_id || null,
      marketplaces || null,
      pickup_partner || null,
      formattedReturnDate,
      formattedOrderDate,
      item_condition || null,
      claim_raised || null,
      ticket_id || null,
      comments || null,
      return_qty || 1,
      formattedCreatedAt,
      created_by,
      deleted_at,
      deleted_by
    ]);

    res.status(200).json({ success: true, message: "Deleted RTO saved successfully" });
  } catch (error) {
    console.error("Error saving deleted RTO:", error);
    res.status(500).json({
      success: false,
      message: "Error saving deleted RTO",
      error: error.message
    });
  }
};

export const getDeletedRtos = async (req, res) => {
  let db;
  try {
    db = await dbPromise;

    const [rows] = await db.query(`
      SELECT 
        id,
        awb_id,
        sku_code,
        product_title,
        order_id,
        marketplaces,
        pickup_partner,
        DATE_FORMAT(return_date, '%Y-%m-%d') AS return_date,
        DATE_FORMAT(order_date, '%Y-%m-%d') AS order_date,
        item_condition,
        claim_raised,
        ticket_id,
        comments,
        return_qty,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        DATE_FORMAT(deleted_at, '%Y-%m-%d %H:%i:%s') AS deleted_at,
        created_by,
        deleted_by
      FROM deleted_rtos
      ORDER BY deleted_at DESC
    `);

    res.status(200).json({
      success: true,
      data: rows || [],
    });
  } catch (error) {
    console.error("Error fetching deleted RTOs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch deleted RTOs",
      error: error.message,
    });
  }
};

export const restoreDeletedRto = async (req, res) => {
  let db;
  try {
    db = await dbPromise;
    const { id } = req.params;

    const [row] = await db.query("SELECT * FROM deleted_rtos WHERE id = ?", [id]);
    if (!row.length) return res.status(404).json({ success: false, message: "Deleted RTO not found" });

    const rto = row[0];

    await db.query(
      `INSERT INTO rto_submissions 
      (marketplaces, pickup_partner, return_date, sku_code, product_title, awb_id, order_id, order_date, courier, item_condition, claim_raised, ticket_id, return_qty, comments, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rto.marketplaces, rto.pickup_partner, rto.return_date, rto.sku_code, rto.product_title, rto.awb_id,
        rto.order_id, rto.order_date, rto.courier, rto.item_condition, rto.claim_raised,
        rto.ticket_id, rto.return_qty, rto.comments, rto.created_at, rto.created_by
      ]
    );

    await db.query("DELETE FROM deleted_rtos WHERE id = ?", [id]);

    res.json({ success: true, message: "RTO restored successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const finalDeleteDeletedRto = async (req, res) => {
  let db;
  try {
    db = await dbPromise;
    const { id } = req.params;
    await db.query("DELETE FROM deleted_rtos WHERE id = ?", [id]);
    res.json({ success: true, message: "Deleted RTO permanently removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


