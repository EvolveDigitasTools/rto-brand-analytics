import dbPromise from "../db.js";

// export const fetchMonthlyRtoData = async (req, res) => {
//     let db;
//     try {
//         db = await dbPromise;
//         const [rows] = await db.query(
//             "SELECT * FROM rto_submissions ORDER BY id DESC");
//             res.json({
//                 success: true,
//                 data: rows,
//             });
//     } catch (error) {
//         console.error("❌ Error fetching Monthly RTO data:", error);
//         res.status(500).json({
//             success: false,
//             message: "Server error while fetching Monthly RTO data",
//         });
//     }
// };

// Phase 2 Working with
// export const fetchMonthlyRtoData = async (req, res) => {
//     const { year, month } = req.query;
//     let db;

//     if (!year || !month) {
//         return res.status(400).json({
//             success: false,
//             message: "Year and month are required"
//         });
//     }

//     try {
//         db = await dbPromise;

//         const [rows] = await db.query(
//             `
//             SELECT
//                 ROW_NUMBER() OVER () AS id,
//                 marketplaces,
//                 pickup_partner,
//                 return_date,
//                 sku_code,
//                 product_title,
//                 awb_id,
//                 item_condition,
//                 claim_raised,
//                 ticket_id,
//                 return_qty,
//                 created_at,
//                 created_by,
//                 COUNT(*) AS total_orders,

//                 -- Count rows where return_qty > 0 (actual RTO returned items)
//                 SUM(CASE WHEN return_qty > 0 THEN return_qty ELSE 0 END) AS total_rto_qty,

//                 ROUND(
//                     (SUM(CASE WHEN return_qty > 0 THEN return_qty ELSE 0 END) /
//                      NULLIF(COUNT(*),0)) * 100,
//                 2) AS rto_percentage

//             FROM rto_submissions
//             WHERE DATE_FORMAT(return_date, '%Y') = ?
//               AND DATE_FORMAT(return_date, '%m') = ?

//             GROUP BY sku_code, product_title, marketplaces, pickup_partner, return_date, awb_id, item_condition, claim_raised, ticket_id, return_qty, created_at, created_by
//             ORDER BY rto_percentage DESC;
//             `,
//             [year, month]
//         );

//         res.json({
//             success: true,
//             data: rows,
//         });

//     } catch (error) {
//         console.error("❌ Error fetching Monthly RTO data:", error);

//         res.status(500).json({
//             success: false,
//             message: "Server error while fetching Monthly RTO data",
//         });
//     }
// };

// Phase 3 Working with
export const fetchMonthlyRtoData = async (req, res) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({
      success: false,
      message: "Year and month are required",
    });
  }

  try {
    const db = await dbPromise;

    // 1️⃣ GROUP BY SKU ONLY → SUM RETURN QTY
    const [skuSummary] = await db.query(
      `
        SELECT 
            sku_code,
            MAX(product_title) AS product_title,
            SUM(return_qty) AS total_rto_qty,
            MIN(created_at) AS created_at,
            MAX(created_by) AS created_by
        FROM rto_submissions
        WHERE DATE_FORMAT(created_at, '%Y') = ?
        AND DATE_FORMAT(created_at, '%m') = ?
        GROUP BY sku_code
      `,
      [year, month]
    );

    if (skuSummary.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // 2️⃣ Condition breakdown per SKU
    const [conditionCounts] = await db.query(
      `
        SELECT 
            sku_code,
            item_condition,
            COUNT(*) AS count
        FROM rto_submissions
        WHERE DATE_FORMAT(created_at, '%Y') = ?
        AND DATE_FORMAT(created_at, '%m') = ?
        GROUP BY sku_code, item_condition
      `,
      [year, month]
    );

    const condMap = {};

    conditionCounts.forEach((row) => {
      const sku = row.sku_code;

      if (!condMap[sku]) {
        condMap[sku] = {
          good: 0,
          damaged: 0,
          missing: 0,
          wrong_return: 0,
          used: 0,
        };
      }

      const c = row.item_condition.toLowerCase();

      if (c.includes("good")) condMap[sku].good = row.count;
      else if (c.includes("damaged")) condMap[sku].damaged = row.count;
      else if (c.includes("missing")) condMap[sku].missing = row.count;
      else if (c.includes("wrong")) condMap[sku].wrong_return = row.count;
      else if (c.includes("used")) condMap[sku].used = row.count;
    });

    // 3️⃣ Build final rows for UI
    const finalRows = skuSummary.map((r) => ({
      id: r.sku_code,
      sku_code: r.sku_code,
      product_title: r.product_title,
      total_rto_qty: r.total_rto_qty,
      total_orders: 0,
      rto_percentage: 0,
      created_at: r.created_at,
      created_by: r.created_by,

      // Condition counts added
      ...(condMap[r.sku_code] || {
        good: 0,
        damaged: 0,
        missing: 0,
        wrong_return: 0,
        used: 0,
      }),
    }));

    res.json({ success: true, data: finalRows });

  } catch (err) {
    console.error("❌ ERROR (Monthly RTO Data):", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching Monthly RTO data",
    });
  }
};


export const fetchMonthlyRtoBreakdown = async (req, res) => {
  const { sku, year, month } = req.query;

  if (!sku || !year || !month) {
    return res.status(400).json({
      success: false,
      message: "sku, year and month are required",
    });
  }

  try {
    const db = await dbPromise;

    const [rows] = await db.query(
      `
        SELECT 
          marketplaces,
          pickup_partner,
          sku_code,
          item_condition,
          ticket_id,
          return_qty
        FROM rto_submissions
        WHERE sku_code = ?
        AND DATE_FORMAT(created_at, '%Y') = ?
        AND DATE_FORMAT(created_at, '%m') = ?
        ORDER BY marketplaces, pickup_partner;
      `,
      [sku, year, month]
    );

    if (rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // ⭐ FINAL FIX: Correct grouping map
    const breakdownMap = {};

    rows.forEach((r) => {
      const key = `${r.marketplaces}__${r.pickup_partner}`;

      // Create group if not exists
      if (!breakdownMap[key]) {
        breakdownMap[key] = {
          marketplaces: r.marketplaces,
          pickup_partner: r.pickup_partner,
          sku_code: r.sku_code,
          total_orders: 0,
          total_rto_qty: 0,
          good: 0,
          damaged: 0,
          missing: 0,
          wrong_return: 0,
          used: 0,
          ticket_id: r.ticket_id || "-",
        };
      }

      // Add qty
      breakdownMap[key].total_rto_qty += r.return_qty;

      // Clean condition
      const cond = (r.item_condition || "").toLowerCase().trim();

      if (cond.includes("good")) breakdownMap[key].good += r.return_qty;
      else if (cond.includes("damaged")) breakdownMap[key].damaged += r.return_qty;
      else if (cond.includes("missing")) breakdownMap[key].missing += r.return_qty;
      else if (cond.includes("wrong")) breakdownMap[key].wrong_return += r.return_qty;
      else if (cond.includes("used")) breakdownMap[key].used += r.return_qty;
    });

    // RETURN AS ARRAY
    return res.json({
      success: true,
      data: Object.values(breakdownMap),
    });

  } catch (err) {
    console.error("❌ Breakdown API Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching breakdown",
    });
  }
};






