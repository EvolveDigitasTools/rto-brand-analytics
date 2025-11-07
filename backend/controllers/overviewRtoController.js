import dbPromise from "../db.js";

export const getRTOOverview = async (req, res) => {
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
};