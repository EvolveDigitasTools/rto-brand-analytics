import db from "../db.js";

// ✅ Get all vendors
export const getVendors = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT vendorCode, companyName FROM vendor"
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching vendors:", err);
    res.status(500).json({ message: "Database query failed" });
  }
};

// ✅ Get all PO codes
export const getPoCodes = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT poCode, createdBy, createdAt FROM purchase_order ORDER BY createdAt DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("DB error fetching PO codes:", err);
    res.status(500).json({ error: "DB error fetching PO codes" });
  }
};

// ✅ Get SKU codes - Phase - 1 (Only getting SKU and Title)
// export const getSkuByCode = async (req, res) => {
//   try {
//     const { skuCode } = req.query;
//     if (!skuCode) {
//       return res.status(400).json({ success: false, message: "skuCode is required" });
//     }

//     // ✅ Destructure to get rows from MySQL
//     const [skuRows] = await db.query(
//       "SELECT * FROM sku WHERE skuCode = ?",
//       [skuCode]
//     );

//     if (skuRows.length === 0) {
//       return res.status(404).json({ success: false, message: "SKU not found" });
//     }

//     const sku = skuRows[0];

//     const [skuDetailsRows] = await db.query(
//       "SELECT * FROM sku_details WHERE skuId = ?",
//       [sku.id]
//     );

//     const details = skuDetailsRows.length > 0 ? skuDetailsRows[0] : null;

//     return res.json({
//       success: true,
//       data: {
//         sku,
//         details,
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching SKU:", error);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// ✅ Get SKU codes - Phase - 2 (Testing with SKU, SAP and Title)
export const getSkuByCode = async (req, res) => {
  try {
    const { skuCode } = req.query;
    if (!skuCode) {
      return res.status(400).json({ success: false, message: "skuCode is required" });
    }

    // ✅ Destructure to get rows from MySQL
    const [skuRows] = await db.query(
      "SELECT * FROM sku WHERE skuCode = ?",
      [skuCode]
    );

    if (skuRows.length === 0) {
      return res.status(404).json({ success: false, message: "SKU not found" });
    }

    const sku = skuRows[0];

    const [skuDetailsRows] = await db.query(
      "SELECT * FROM sku_details WHERE skuId = ?",
      [sku.id]
    );
    console.log("Fetched SKU Details:", skuDetailsRows[0]);

    const details = skuDetailsRows.length > 0 ? skuDetailsRows[0] : null;

    return res.json({
      success: true,
      data: {
        sku,
        details,
      },
    });
  } catch (error) {
    console.error("Error fetching SKU:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
