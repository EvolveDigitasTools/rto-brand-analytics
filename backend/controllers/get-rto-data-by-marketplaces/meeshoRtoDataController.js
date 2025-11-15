import db from "../../db.js";

export const getRtoDataByAwb = async (req, res) => {
  const { awbId } = req.params;

  if (!awbId) {
    return res.status(400).json({ message: "AWB number is required" });
  }

  try {
    const [results] = await db.query(
      `SELECT 
        courier_partner,
        sku,
        product_name,
        order_number,
        DATE_FORMAT(CAST(dispatch_date AS CHAR), '%d-%m-%Y') AS dispatch_date,
        qty,
        DATE_FORMAT(delivered_date, '%d-%m-%Y') AS return_date
      FROM meesho_rto_data
      WHERE awb_number = ?`,
      [awbId]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: "No records found for given AWB number" });
    }

    res.status(200).json({
      success: true,
      message: "RTO data fetched successfully",
      data: results[0],
    });
  } catch (err) {
    console.error("❌ Database error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

// export const getRtoDataByAwb = async (req, res) => {
//   let { awbId } = req.params;

//   if (!awbId || awbId.trim() === "") {
//     return res.status(400).json({ message: "AWB number is required" });
//   }

//   awbId = awbId.trim();

//   try {
//     const [results] = await db.query(
//       `SELECT 
//         courier_partner,
//         sku,
//         product_name,
//         order_number,
//         DATE_FORMAT(CAST(dispatch_date AS CHAR), '%d-%m-%Y') AS dispatch_date,
//         qty,
//         DATE_FORMAT(delivered_date, '%d-%m-%Y') AS return_date
//       FROM meesho_rto_data
//       WHERE 
//         awb_number = ? 
//         OR awb_number LIKE ? 
//         OR CAST(awb_number AS CHAR) = ?`,
//       [awbId, `%${awbId}%`, awbId]
//     );

//     if (results.length === 0) {
//       return res.status(404).json({ message: "No records found for given AWB" });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "RTO data fetched successfully",
//       data: results,
//     });

//   } catch (err) {
//     console.error("❌ Database error:", err);
//     return res.status(500).json({ success: false, message: "Database error" });
//   }
// };
