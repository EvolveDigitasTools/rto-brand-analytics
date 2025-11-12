import dbPromise from "../db.js";

export const getRTOOverview = async (req, res) => {
  try {
    const db = await dbPromise;

    // 1 Total RTO Count
    const [totalRTOResult] = await db.query(`SELECT COUNT(*) AS totalRTOs FROM rto_submissions`);
    const totalRTOs = totalRTOResult[0].totalRTOs;

    // 2 RTO This Month
    const [monthRTOResult] = await db.query(`
      SELECT COUNT(*) AS thisMonthRTO 
      FROM rto_submissions 
      WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
    `);
    const thisMonthRTO = monthRTOResult[0].thisMonthRTO;

    // 3 Good RTOs
    const [goodRTOs] = await db.query(`SELECT COUNT(*) AS goodRTOs FROM rto_submissions WHERE item_condition = 'Good'`);

    // 4 Damaged RTOs
    const [damagedRTOs] = await db.query(`SELECT COUNT(*) AS damagedRTOs FROM rto_submissions WHERE item_condition = 'Damaged'`);

    // 5 Damaged RTOs
    const [wrongReturnRTOs] = await db.query(`SELECT COUNT(*) AS wrongReturnRTOs FROM rto_submissions WHERE item_condition = 'Wrong Return'`);

    // 6 Total Claim Raised
    const [claims] = await db.query(`SELECT COUNT(*) AS totalClaims FROM rto_submissions WHERE claim_raised = 'Yes'`);

    // 7 Total RTO Cost (based on latest purchase order per sku)
    const [rtoCostResult] = await db.query(`
      SELECT SUM(por.unitCost * rs.return_qty) AS totalCost
      FROM rto_submissions rs
      JOIN (
        SELECT skuId, MAX(createdAt) AS latestDate
        FROM purchase_order_record
        GROUP BY skuId
      ) latest ON latest.skuId = (SELECT id FROM sku WHERE skuCode = rs.sku_code LIMIT 1)
      JOIN purchase_order_record por ON por.skuId = latest.skuId AND por.createdAt = latest.latestDate
    `);
    const totalCost = rtoCostResult[0].totalCost || 0;

    // 8 Bar Chart (Pickup Partner wise RTO this month)
    const [pickupPartners] = await db.query(`
      SELECT 
        COALESCE(pickup_partner, 'Unknown') AS pickup_partner, 
        COUNT(*) AS count
      FROM rto_submissions
      GROUP BY pickup_partner
      ORDER BY count DESC
    `);

    // 9 Doughnut Chart Data: RTOs by Created By
    const [createdByData] = await db.query(`
      SELECT 
        COALESCE(created_by, 'Unknown') AS created_by, 
        COUNT(*) AS count
      FROM rto_submissions
      GROUP BY created_by
      ORDER BY count DESC
    `);

    // 10 Top 10 Major RTOs (same SKUs)
    const [topRTOs] = await db.query(`
      SELECT sku_code, product_title, COUNT(*) AS total
      FROM rto_submissions
      GROUP BY sku_code, product_title
      ORDER BY total DESC
      LIMIT 10
    `);

    const barLabels = pickupPartners.map(row => row.pickup_partner);
    const barCounts = pickupPartners.map(row => row.count);

    const doughnutLabels = createdByData.map(r => r.created_by);
    const doughnutCounts = createdByData.map(r => r.count);

    res.json({
      success: true,
      cards: {
        totalRTOs,
        thisMonthRTO,
        goodRTOs: goodRTOs[0].goodRTOs,
        damagedRTOs: damagedRTOs[0].damagedRTOs,
        wrongReturnRTOs: wrongReturnRTOs[0].wrongReturnRTOs,
        totalClaims: claims[0].totalClaims,
        totalCost
      },
      bar: { labels: barLabels, counts: barCounts },
      doughnut: { labels: doughnutLabels, counts: doughnutCounts },
      topRTOs
    });

  } catch (error) {
    console.error("Error fetching RTO overview:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
