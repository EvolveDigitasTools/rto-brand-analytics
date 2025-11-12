import dbPromise from "../db.js";

export const getRTODataRoleBased = async (req, res) => {
  let db;
  try {
    db = await dbPromise;

    let query = `
      SELECT * FROM rto_submissions
      WHERE (is_inventory_updated IS NULL OR is_inventory_updated = FALSE)
      ORDER BY id DESC
    `;
    let params = [];

    if (req.user.role === "user") {
      // Regular user: only their own unprocessed RTOs
      query = `
        SELECT * FROM rto_submissions
        WHERE created_by = ?
          AND (is_inventory_updated IS NULL OR is_inventory_updated = FALSE)
        ORDER BY id DESC
      `;
      params = [req.user.email];
    } else if (req.user.role === "admin") {
      // Admin: all unprocessed RTOs
      query = `
        SELECT * FROM rto_submissions
        WHERE (is_inventory_updated IS NULL OR is_inventory_updated = FALSE)
        ORDER BY id DESC
      `;
    } else if (req.user.role === "superadmin") {
      // Superadmin: all unprocessed RTOs
      query = `
        SELECT * FROM rto_submissions
        WHERE (is_inventory_updated IS NULL OR is_inventory_updated = FALSE)
        ORDER BY id DESC
      `;
    }

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching RTO data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateRTOData = async (req, res) => {
    try {
    const db = await dbPromise;
    const { id } = req.params;

    const {
      marketplaces = null,
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
        marketplaces=?,
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
      marketplaces,
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
};