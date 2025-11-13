import dbPromise from "../db.js";
import jwt from "jsonwebtoken";

// export const submitRto = async (req, res) => {
//     let db;
//   try {
//     db = await dbPromise

//     const { marketplaces, pickupPartner, returnDate, fields } = req.body;

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

//     // Log request body for debugging
//     console.log("Request Body:", req.body);

//     if (!marketplaces || !pickupPartner || !returnDate || !fields || fields.length === 0) {
//       return res.status(400).json({ success: false, message: "Invalid data" });
//     }

//     // Validate returnDate format
//     const parsedReturnDate = new Date(returnDate);
//     if (isNaN(parsedReturnDate.getTime())) {
//       return res.status(400).json({ success: false, message: "Invalid return_date format" });
//     }

//     const insertQueries = fields.map((field) => {
//       // Validate orderDate format
//       const parsedOrderDate = field.orderDate ? new Date(field.orderDate) : null;
//       if (field.orderDate && isNaN(parsedOrderDate.getTime())) {
//         console.warn(`Invalid order_date for field: ${JSON.stringify(field)}`);
//         return res.status(400).json({ success: false, message: `Invalid order_date for SKU: ${field.skuCode}` });
//       }

//       return [
//         marketplaces,
//         pickupPartner,
//         parsedReturnDate,
//         field.skuCode || null,
//         field.productTitle || null,
//         field.awbId || null,
//         field.orderId || null,
//         parsedOrderDate,
//         field.courier || null,
//         field.itemCondition || null,
//         field.claimRaised || null,
//         field.ticketId || null,
//         field.returnQty || 1,
//         field.comments || null,
//         new Date(),
//         created_by
//       ];
//     });

//     // Log insert queries for debugging
//     console.log("Insert Queries:", insertQueries);

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
//     res.status(500).json({ success: false, message: "Server error" });
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
        null, // courier REMOVED from frontend
        itemCondition || null,
        claimRaised || null,
        ticketId || null,
        returnQty || 1,
        comments || null,
        new Date(),
        created_by,
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
        created_by
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
