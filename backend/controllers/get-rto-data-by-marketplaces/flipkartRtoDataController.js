import db from "../../db.js";

export const getFlipkartRTOByTrackingId = async (req, res) => {
  try {
    const { awbId } = req.params;

    if (!awbId) {
      return res
        .status(400)
        .json({ success: false, message: "Tracking ID required" });
    }

    const [rows] = await db.query(
      `SELECT * FROM flipkart_rto_data WHERE tracking_id = ? LIMIT 1`,
      [awbId]
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Flipkart RTO record not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error fetching Flipkart RTO:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error fetching Flipkart RTO" });
  }
};
