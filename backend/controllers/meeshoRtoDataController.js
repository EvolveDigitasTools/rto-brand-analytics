import db from "../db.js";

export const getRtoDataByAwb = async (req, res) => {
  const { awbNumber } = req.params;

  if (!awbNumber) {
    return res.status(400).json({ message: "AWB number is required" });
  }

  try {
    const [results] = await db.query(
      `SELECT 
        courier_partner,
        return_created_date,
        sku,
        product_name,
        order_number,
        dispatch_date,
        qty
      FROM meesho_rto_data
      WHERE awb_number = ?`,
      [awbNumber]
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
