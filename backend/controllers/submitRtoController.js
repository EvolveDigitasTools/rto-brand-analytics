import dbPromise from "../db.js";
import jwt from "jsonwebtoken";

// export const submitRto = async (req, res) => {
//   let db;
//   try {
//     db = await dbPromise;

//     const { fields } = req.body;

//     const token = req.headers.authorization?.split("Bearer ")[1];
//     if (!token) {
//       return res.status(401).json({ success: false, message: "No token provided" });
//     }

//     let created_by;
//     try {
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       created_by = decoded.email;
//     } catch (err) {
//       return res.status(403).json({ success: false, message: "Invalid token" });
//     }

//     if (!fields || !Array.isArray(fields) || fields.length === 0) {
//       return res.status(400).json({ success: false, message: "Fields array is required" });
//     }

//     const insertQueries = fields.map((field) => {
//       const {
//         marketplaces,
//         pickupPartner,
//         returnDate,
//         skuCode,
//         productTitle,
//         awbId,
//         orderId,
//         orderDate,
//         itemCondition,
//         claimRaised,
//         ticketId,
//         returnQty,
//         comments,
//       } = field;

//       // Validate required row-based fields
//       if (!marketplaces || !pickupPartner || !returnDate) {
//         throw new Error("marketplaces, pickupPartner, returnDate are required in each row");
//       }

//       // Convert dates
//       const parsedReturnDate = new Date(returnDate).toISOString().split("T")[0];
//       const parsedOrderDate = orderDate ? new Date(orderDate).toISOString().split("T")[0] : null;

//       return [
//         marketplaces,
//         pickupPartner,
//         parsedReturnDate,
//         skuCode || null,
//         productTitle || null,
//         awbId || null,
//         orderId || null,
//         parsedOrderDate,
//         null, // courier REMOVED from frontend
//         itemCondition || null,
//         claimRaised || null,
//         ticketId || null,
//         returnQty || 1,
//         comments || null,
//         new Date(),
//         created_by,
//       ];
//     });

//     const sql = `
//       INSERT INTO rto_submissions 
//       (
//         marketplaces,
//         pickup_partner,
//         return_date,
//         sku_code,
//         product_title,
//         awb_id,
//         order_id,
//         order_date,
//         courier,
//         item_condition,
//         claim_raised,
//         ticket_id,
//         return_qty,
//         comments,
//         created_at,
//         created_by
//       )
//       VALUES ?
//     `;

//     await db.query(sql, [insertQueries]);

//     res.json({ success: true, message: "RTO data saved successfully" });

//   } catch (error) {
//     console.error("Error inserting RTO data:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

export const submitRto = async (req, res) => {
  let db;
  try {
    db = await dbPromise;

    const { fields } = req.body;

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

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ success: false, message: "Fields array is required" });
    }

    const insertQueries = fields.map((field) => {
      const {
        marketplaces,
        pickupPartner,
        returnDate,
        skuCode,
        productTitle,
        awbId,
        orderId,
        orderDate,
        itemCondition,
        claimRaised,
        ticketId,
        returnQty,
        comments,
      } = field;

      let is_claim_resolved = 0;
      let resolved_by = null;
      let resolved_at = null;

      if (
        itemCondition !== "Good" &&
        claimRaised === "Yes" &&
        ticketId &&
        ticketId.trim() !== ""
      ) {
        is_claim_resolved = 1;
        resolved_by = created_by;
        resolved_at = new Date(); 
      }

      // Validate required row-based fields
      if (!marketplaces || !pickupPartner || !returnDate) {
        throw new Error("marketplaces, pickupPartner, returnDate are required in each row");
      }

      // Convert dates
      const parsedReturnDate = new Date(returnDate).toISOString().split("T")[0];
      const parsedOrderDate = orderDate ? new Date(orderDate).toISOString().split("T")[0] : null;

      return [
        marketplaces,
        pickupPartner,
        parsedReturnDate,
        skuCode || null,
        productTitle || null,
        awbId || null,
        orderId || null,
        parsedOrderDate,
        null, // courier removed
        itemCondition || null,
        claimRaised || null,
        ticketId || null,
        returnQty || 1,
        comments || null,
        new Date(),
        created_by,
        is_claim_resolved,
        resolved_by,
        resolved_at
      ];
    });

    const sql = `
      INSERT INTO rto_submissions 
      (
        marketplaces,
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
        created_by,
        is_claim_resolved,
        resolved_by,
        resolved_at
      )
      VALUES ?
    `;

    await db.query(sql, [insertQueries]);

    res.json({ success: true, message: "RTO data saved successfully" });

  } catch (error) {
    console.error("Error inserting RTO data:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
