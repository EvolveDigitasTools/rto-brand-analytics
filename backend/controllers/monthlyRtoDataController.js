import dbPromise from "../db.js";

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

    // ✅ Get correct last day for any month (28,29,30,31 auto)
    function getLastDay(y, m) {
      return new Date(y, m, 0).getDate(); 
    }

    const lastDay = getLastDay(Number(year), Number(month));

    /* -----------------------------------------
     * 1) Fetch RTO summary grouped by SKU
     * ----------------------------------------- */
    const [skuSummary] = await db.query(
      `
      SELECT 
        sku_code,
        MAX(product_title) AS product_title,
        SUM(return_qty) AS total_rto_qty,
        MIN(created_at) AS created_at,
        MAX(created_by) AS created_by
      FROM rto_submissions
      WHERE YEAR(created_at) = ?
        AND MONTH(created_at) = ?
      GROUP BY sku_code
      `,
      [year, month]
    );

    // If no rows for selected month/year
    if (!skuSummary.length) {
      return res.json({
        success: true,
        data: [],
        message: `No return data found for ${year}-${month}.`
      });
    }

    /* -----------------------------------------
     * 2) Extract base SKUs
     * ----------------------------------------- */
    function extractBaseSku(rawSku) {
      if (!rawSku) return [];

      let cleaned = rawSku.replace(/-PK\d*/gi, "");
      const numeric = cleaned.match(/\b\d+\b/g);

      return numeric ? numeric.map(String) : [rawSku];
    }

    let baseSkuList = [];

    for (const r of skuSummary) {
      const extracted = extractBaseSku(r.sku_code);
      baseSkuList.push(...extracted);
    }

    baseSkuList = Array.from(new Set(baseSkuList));

    /* -----------------------------------------
     * 3) Lookup SKU table
     * ----------------------------------------- */
    const [skuRows] = await db.query(
      `SELECT id, skuCode FROM sku WHERE skuCode IN (?)`,
      [baseSkuList.length ? baseSkuList : ["__NO_MATCH__"]]
    );

    const skuIdMap = {};
    skuRows.forEach((r) => (skuIdMap[r.skuCode] = r.id));

    /* -----------------------------------------
     * 4) Lookup COMBO table for leftovers
     * ----------------------------------------- */
    const missingBases = baseSkuList.filter((b) => !skuIdMap[b]);

    let comboRows = [];
    if (missingBases.length) {
      [comboRows] = await db.query(
        `SELECT id, combo_name FROM combo_sku WHERE combo_name IN (?)`,
        [missingBases]
      );
    }

    const comboIdMap = {};
    comboRows.forEach((c) => (comboIdMap[c.combo_name] = c.id));

    /* -----------------------------------------
     * 5) Fetch combo children
     * ----------------------------------------- */
    let comboChildMap = {};

    if (comboRows.length) {
      const comboIds = comboRows.map((r) => r.id);

      const [childRows] = await db.query(
        `
        SELECT combo_sku_id, sku_id
        FROM combo_sku_items
        WHERE combo_sku_id IN (?)
        `,
        [comboIds]
      );

      childRows.forEach((cr) => {
        const combo = comboRows.find((c) => c.id === cr.combo_sku_id);
        if (!combo) return;
        if (!comboChildMap[combo.combo_name])
          comboChildMap[combo.combo_name] = [];
        comboChildMap[combo.combo_name].push(cr.sku_id);
      });
    }

    /* -----------------------------------------
     * 6) Condition counts
     * ----------------------------------------- */
    const [conditionCounts] = await db.query(
      `
      SELECT sku_code, item_condition, COUNT(*) AS count
      FROM rto_submissions
      WHERE YEAR(created_at) = ?
        AND MONTH(created_at) = ?
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

      const cond = row.item_condition.toLowerCase();
      if (cond.includes("good")) condMap[sku].good += row.count;
      else if (cond.includes("damaged")) condMap[sku].damaged += row.count;
      else if (cond.includes("missing")) condMap[sku].missing += row.count;
      else if (cond.includes("wrong")) condMap[sku].wrong_return += row.count;
      else if (cond.includes("used")) condMap[sku].used += row.count;
    });

    /* -----------------------------------------
     * 7) Load ALL orders & order_items
     * ----------------------------------------- */
    const [orderItemRows] = await db.query(
      `SELECT sku_id, order_id FROM order_items`
    );

    let nextMonth = Number(month) + 1;
    let nextYear = Number(year);

    if (nextMonth === 13) {
      nextMonth = 1;
      nextYear++;
    }

    const nextMonthStr = String(nextMonth).padStart(2, "0");

    const [orderRows] = await db.query(
      `
      SELECT id
      FROM orders
      WHERE orderDateTime >= CONCAT(?, '-', ?, '-01')
      AND orderDateTime <  CONCAT(?, '-', ?, '-01')
      `,
      [year, month, nextYear, nextMonthStr]
    );

    const validOrderIds = new Set(orderRows.map((o) => o.id));

    // Build map: sku_id → order_ids
    const skuOrderMap = {};
    orderItemRows.forEach((oi) => {
      if (!skuOrderMap[oi.sku_id]) skuOrderMap[oi.sku_id] = new Set();
      if (validOrderIds.has(oi.order_id)) {
        skuOrderMap[oi.sku_id].add(oi.order_id);
      }
    });

    /* -----------------------------------------
     * 8) Combine everything into final output
     * ----------------------------------------- */
    const finalRows = [];

    for (const row of skuSummary) {
      const origSku = row.sku_code;
      const extractedBases = extractBaseSku(origSku);

      let childSkuIds = [];

      for (const base of extractedBases) {
        if (skuIdMap[base]) {
          childSkuIds.push(skuIdMap[base]);
        } else if (comboChildMap[base]) {
          childSkuIds.push(...comboChildMap[base]);
        }
      }

      childSkuIds = Array.from(new Set(childSkuIds));

      let totalOrders = 0;

      childSkuIds.forEach((id) => {
        if (skuOrderMap[id]) {
          totalOrders += skuOrderMap[id].size;
        }
      });

      const rtoPercentage =
        totalOrders > 0
          ? ((row.total_rto_qty / totalOrders) * 100).toFixed(2)
          : 0;

      finalRows.push({
        id: origSku,
        sku_code: origSku,
        product_title: row.product_title,
        total_rto_qty: row.total_rto_qty,
        total_orders: totalOrders,
        rto_percentage: rtoPercentage,
        created_at: row.created_at,
        created_by: row.created_by,
        ...(condMap[origSku] || {
          good: 0,
          damaged: 0,
          missing: 0,
          wrong_return: 0,
          used: 0,
        }),
      });
    }

    return res.json({ success: true, data: finalRows });

  } catch (err) {
    console.error("❌ ERROR (fetchMonthlyRtoData):", err);
    return res.status(500).json({ success: false, message: "Server error" });
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

    /* ---------------------------------------------------------
     * 1) Fetch RTO breakdown rows
     * --------------------------------------------------------- */
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
        AND YEAR(created_at) = ?
        AND MONTH(created_at) = ?
        ORDER BY marketplaces, pickup_partner;
      `,
      [sku, year, month]
    );

    if (!rows.length) {
      return res.json({ success: true, data: [] });
    }

    /* ---------------------------------------------------------
     * 2) Extract base SKUs (faster regex)
     * --------------------------------------------------------- */
    const cleanedSku = sku.replace(/-PK\d*/gi, "");
    const extractedBases = cleanedSku.match(/\b\d+\b/g) || [cleanedSku];

    /* ---------------------------------------------------------
     * 3) Fetch SKU IDs + Combo children in 1 pass
     * --------------------------------------------------------- */
    const [skuRows] = await db.query(
      `SELECT id, skuCode FROM sku WHERE skuCode IN (?)`,
      [extractedBases]
    );

    const skuIdMap = Object.fromEntries(skuRows.map((s) => [s.skuCode, s.id]));

    const missingList = extractedBases.filter((b) => !skuIdMap[b]);
    let comboChildIds = [];

    if (missingList.length) {
      const [comboRows] = await db.query(
        `SELECT id FROM combo_sku WHERE combo_name IN (?)`,
        [missingList]
      );

      if (comboRows.length) {
        const comboIds = comboRows.map((c) => c.id);

        const [childRows] = await db.query(
          `SELECT sku_id FROM combo_sku_items WHERE combo_sku_id IN (?)`,
          [comboIds]
        );

        comboChildIds = childRows.map((r) => r.sku_id);
      }
    }

    const skuIdList = [...new Set([...Object.values(skuIdMap), ...comboChildIds])];

    /* ---------------------------------------------------------
     * 4) SAFE MONTH RANGE (fix MySQL invalid date)
     * --------------------------------------------------------- */

    // Compute first day of next month — safe for all months
    let nextMonth = Number(month) + 1;
    let nextYear = Number(year);

    if (nextMonth === 13) {
      nextMonth = 1;
      nextYear++;
    }

    const nextMonthStr = String(nextMonth).padStart(2, "0");

    /* ---------------------------------------------------------
     * 5) Fetch orders of selected month (SAFE)
     * --------------------------------------------------------- */
    const [orderRows] = await db.query(
      `
      SELECT id
      FROM orders
      WHERE orderDateTime >= CONCAT(?, '-', ?, '-01')
      AND orderDateTime <  CONCAT(?, '-', ?, '-01')
      `,
      [year, month, nextYear, nextMonthStr]
    );

    if (!orderRows.length) {
      // No orders this month → total_orders = 0 for all groups
      return res.json({
        success: true,
        data: rows.map((r) => ({
          marketplaces: r.marketplaces,
          pickup_partner: r.pickup_partner,
          sku_code: sku,
          total_orders: 0,
          total_rto_qty: r.return_qty,
          good: r.item_condition.includes("good") ? r.return_qty : 0,
          damaged: r.item_condition.includes("damaged") ? r.return_qty : 0,
          missing: r.item_condition.includes("missing") ? r.return_qty : 0,
          wrong_return: r.item_condition.includes("wrong") ? r.return_qty : 0,
          used: r.item_condition.includes("used") ? r.return_qty : 0,
          ticket_id: r.ticket_id || "-",
        })),
      });
    }

    const validOrderIds = new Set(orderRows.map((o) => o.id));

    /* ---------------------------------------------------------
     * 6) Order items lookup
     * --------------------------------------------------------- */
    const [orderItemRows] = await db.query(
      `
      SELECT sku_id, order_id 
      FROM order_items
      WHERE sku_id IN (?)
      `,
      [skuIdList]
    );

    /* ---------------------------------------------------------
     * 7) Compute matched orders
     * --------------------------------------------------------- */
    const matchedOrders = new Set(
      orderItemRows
        .filter((oi) => validOrderIds.has(oi.order_id))
        .map((oi) => oi.order_id)
    );

    /* ---------------------------------------------------------
     * 8) Build breakdown map
     * --------------------------------------------------------- */
    const breakdownMap = {};

    for (const r of rows) {
      const key = `${r.marketplaces}__${r.pickup_partner}`;

      if (!breakdownMap[key]) {
        breakdownMap[key] = {
          marketplaces: r.marketplaces,
          pickup_partner: r.pickup_partner,
          sku_code: sku,
          total_orders: matchedOrders.size,
          total_rto_qty: 0,
          good: 0,
          damaged: 0,
          missing: 0,
          wrong_return: 0,
          used: 0,
          ticket_id: r.ticket_id || "-",
        };
      }

      const group = breakdownMap[key];

      group.total_rto_qty += r.return_qty;

      const cond = r.item_condition?.toLowerCase();
      if (cond.includes("good")) group.good += r.return_qty;
      else if (cond.includes("damaged")) group.damaged += r.return_qty;
      else if (cond.includes("missing")) group.missing += r.return_qty;
      else if (cond.includes("wrong")) group.wrong_return += r.return_qty;
      else if (cond.includes("used")) group.used += r.return_qty;
    }

    /* ---------------------------------------------------------
     * 9) SEND RESPONSE
     * --------------------------------------------------------- */
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