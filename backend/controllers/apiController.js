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

// ✅ Get SKU codes - Phase - 2 Currently working
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
//     console.log("Fetched SKU Details:", skuDetailsRows[0]);

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


// ✅ Get SKU codes - Phase - 3 (Testing with SKU and Combo SKUs)
export const getSkuByCode = async (req, res) => {
  try {
    const { skuCode } = req.query;
    if (!skuCode) {
      return res.status(400).json({ success: false, message: "skuCode is required" });
    }

    // ✅ Step 1: Try to find in normal SKU table
    const [skuRows] = await db.query(
      "SELECT * FROM sku WHERE skuCode = ?",
      [skuCode]
    );

    if (skuRows.length > 0) {
      const sku = skuRows[0];

      // Fetch details for normal SKU
      const [skuDetailsRows] = await db.query(
        "SELECT * FROM sku_details WHERE skuId = ?",
        [sku.id]
      );

      return res.json({
        success: true,
        type: "normal",
        data: {
          sku,
          details: skuDetailsRows.length > 0 ? skuDetailsRows[0] : null,
        },
      });
    }

    // ✅ Step 2: If not found, try combo_sku table
    const [comboRows] = await db.query(
      "SELECT * FROM combo_sku WHERE combo_name LIKE ?",
      [`%${skuCode}%`]
    );

    console.log("Combo Search Tried For:", skuCode, "Result Count:", comboRows.length);

    if (comboRows.length > 0) {
      const combo = comboRows[0];
      
      return res.json({
        success: true,
        type: "combo",
        data: {
          sku: {
            skuCode: combo.combo_name,
            name: combo.combo_title,
            data: comboRows[0],
            ...combo, // include other combo fields if needed
          },
          details: null, // no separate details table for combo
        },
      });
    }

    return res.status(404).json({ success: false, message: "SKU or Combo SKU not found" });

  } catch (error) {
    console.error("Error fetching SKU:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


