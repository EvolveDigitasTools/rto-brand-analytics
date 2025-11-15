import db from "../../db.js";

export const getAmazonRTOByOrderId = async (req, res) => {
  try {
    const { awbId } = req.params;
    if (!awbId) {
      return res.status(400).json({ success: false, message: "Order ID required" });
    }

    const [rows] = await db.query(
      `SELECT * FROM amazon_rto_data WHERE order_id = ? OR tracking_id = ? LIMIT 1`,
      [awbId, awbId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Amazon RTO record not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error fetching Amazon RTO:", error);
    res.status(500).json({ success: false, message: "Server error fetching Amazon RTO" });
  }
};
