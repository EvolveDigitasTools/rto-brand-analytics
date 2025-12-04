import dbPromise from "../../db.js";

// 1. Fetch Good RTOs Data - Not in Use
export const goodRtoData = async (req, res) => {
  const db = dbPromise;
  try {
    const [rows] = await db.query(
      `SELECT id, marketplaces, pickup_partner, awb_id, return_date, order_date,
              sku_code, product_title, item_condition, return_qty
       FROM rto_submissions
       WHERE item_condition = 'Good' AND (is_inventory_updated IS NULL OR is_inventory_updated = FALSE)`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ Fetch Good RTO Error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

// 2. Update RTOs Data to Master Inventory
export const updateInventoryFromRtoMultiple = async (req, res) => {
  let conn = null;
  let isPooledConnection = false;

  try {
    // Step 1: Acquire DB connection
    if (dbPromise.getConnection) {
      conn = await dbPromise.getConnection();
      isPooledConnection = true;
    } else {
      conn = dbPromise;
      isPooledConnection = false;
    }

    console.log("DB connection acquired for inventory update");
    await conn.beginTransaction();

    // Step 2: Validate input
    const { selectedIds } = req.body;
    if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
      await conn.rollback();
      if (isPooledConnection) await conn.release();
      return res.status(400).json({
        success: false,
        message: "No RTO IDs selected for update",
      });
    }

    const validIds = selectedIds
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id) && id > 0);

    if (validIds.length === 0) {
      await conn.rollback();
      if (isPooledConnection) await conn.release();
      return res.status(400).json({
        success: false,
        message: "No valid RTO IDs selected",
      });
    }

    console.log("Processing valid IDs:", validIds);

    // Step 3: Fetch all RTO data for selected IDs
    const [goodRtos] = await conn.query(
      `
      SELECT 
        id, marketplaces, pickup_partner, awb_id, order_id, 
        sku_code, product_title, item_condition, return_qty
      FROM rto_submissions
      WHERE LOWER(item_condition) = 'good'
        AND (is_inventory_updated IS NULL OR is_inventory_updated = 0 OR is_inventory_updated = FALSE)
        AND id IN (?)
      `,
      [validIds]
    );

    console.log(`Found ${goodRtos.length} eligible RTO(s) to update`);

    if (goodRtos.length === 0) {
      await conn.commit();
      if (isPooledConnection) await conn.release();
      return res.json({
        success: true,
        message: "No new RTOs to update (already processed or invalid)",
        totalUpdated: 0,
      });
    }

    // ===============================
    // ✨ NEW FEATURE: Not found report
    // ===============================
    const notFoundSKUs = [];

    // Step 4: Process each selected RTO
    for (const rto of goodRtos) {
      const { id, awb_id, sku_code, return_qty } = rto;
      console.log(`Processing RTO ID: ${id} | SKU: ${sku_code} | Qty: ${return_qty}`);

      // Ignore invalid or empty SKUs
      if (!sku_code || sku_code.trim() === "") {
        console.warn(`⚠️ Empty SKU code for RTO ID ${id}`);
        notFoundSKUs.push({ ...rto, reason: "Empty SKU" });
        continue;
      }

      // Handle pack size (e.g. 50004395-PK2)
      const packMatch = sku_code.match(/-PK(\d+)$/i);
      const packSize = packMatch ? parseInt(packMatch[1], 10) : 1;
      const totalQty = return_qty * packSize;
      const baseSku = sku_code.replace(/-PK\d+$/i, "");

      // Step 5: Check SKU type in `sku` table
      const [skuRows] = await conn.query(
        "SELECT id, isCombo FROM sku WHERE skuCode = ?",
        [baseSku]
      );

      // ✅ NORMAL SKU — update slot rows
      if (skuRows.length > 0 && skuRows[0].isCombo === 0) {
        const skuId = skuRows[0].id;

        // Fetch all slot rows for this SKU
        const [slotRows] = await conn.query(
          `
          SELECT id, quantity, batchId, expiryDate 
          FROM inventory 
          WHERE skuId = ? 
          ORDER BY id ASC
          `,
          [skuId]
        );

        if (slotRows.length === 0) {
          console.warn(`⚠️ No inventory slots found for SKU ${baseSku}`);
          notFoundSKUs.push({ ...rto, baseSku, reason: "No inventory slots found" });
          continue;
        }

        // ✅ Find the earliest expiry date slot
        let targetSlot = null;
        let earliestExpiry = null;

        for (const slot of slotRows) {
          if (slot.expiryDate) {
            const slotExpiry = new Date(slot.expiryDate);
            if (!earliestExpiry || slotExpiry < earliestExpiry) {
              earliestExpiry = slotExpiry;
              targetSlot = slot;
            }
          }
        }

        // ✅ If no expiryDate slots exist, pick first
        if (!targetSlot) targetSlot = slotRows[0];

        console.log(
          `🧩 Updating ${baseSku} in ${targetSlot.batchId} (+${totalQty}) [Expiry: ${
            targetSlot.expiryDate || "N/A"
          }]`
        );

        await conn.query(
          `
          UPDATE inventory
          SET quantity = quantity + ?, inventoryUpdatedAt = NOW()
          WHERE id = ?
          `,
          [totalQty, targetSlot.id]
        );

        // Update last updated time
        await conn.query(
          `UPDATE sku SET inventoryUpdatedAt = NOW() WHERE id = ?`,
          [skuId]
        );

        // ✅ Log update
        await conn.query(
          `
          INSERT INTO rto_data_to_master_inventory
          (rto_id, sku, sku_title, effectiveQty, return_qty, marketplaces, pickup_partner,
            updatedAt, source, awb_number, order_number, item_condition, processed_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)
          `,
          [
            id,
            baseSku,
            rto.product_title || null,
            totalQty,
            return_qty,
            rto.marketplaces || null,
            rto.pickup_partner || null,
            "RTO",
            awb_id,
            rto.order_id || null,
            rto.item_condition || null,
            req.user?.email || "System",
          ]
        );

        console.log(`✅ Updated normal SKU ${baseSku} (${targetSlot.batchId}): +${totalQty}`);
      }

      // ✅ COMBO SKU — distribute to child SKUs
      else {
        const [comboRows] = await conn.query(
          "SELECT id FROM combo_sku WHERE combo_name = ?",
          [baseSku]
        );

        if (comboRows.length === 0) {
          console.warn(`⚠️ Combo SKU not found: ${baseSku}`);
          notFoundSKUs.push({ ...rto, baseSku, reason: "Not found in SKU or Combo" });
          continue;
        }

        const comboId = comboRows[0].id;
        const [childItems] = await conn.query(
          "SELECT sku_id, quantity FROM combo_sku_items WHERE combo_sku_id = ?",
          [comboId]
        );

        if (childItems.length === 0) {
          notFoundSKUs.push({ ...rto, baseSku, reason: "Combo has no child SKUs" });
          continue;
        }

        for (const child of childItems) {
          const childQty = child.quantity * totalQty;

          await conn.query(
            `
            UPDATE inventory 
            SET quantity = quantity + ?, inventoryUpdatedAt = NOW()
            WHERE skuId = ?
            `,
            [childQty, child.sku_id]
          );

          const [skuCodeRow] = await conn.query(
            "SELECT skuCode FROM sku WHERE id = ?",
            [child.sku_id]
          );
          const childSku = skuCodeRow[0]?.skuCode || "Unknown";

          // Log combo item update
          await conn.query(
            `
             INSERT INTO rto_data_to_master_inventory
             (rto_id, sku, sku_title, effectiveQty, return_qty, marketplaces, pickup_partner,
              updatedAt, source, awb_number, order_number, item_condition, processed_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)
            `,
            [
              id,
              childSku,
              rto.product_title || null,
              childQty,
              return_qty,
              rto.marketplaces || null,
              rto.pickup_partner || null,
              "RTO Combo",
              awb_id,
              rto.order_id || null,
              rto.item_condition || null,
              req.user?.email || "System",
            ]
          );

          console.log(`✅ Combo child ${childSku} updated (+${childQty})`);
        }
      }

      // Step 7: Mark RTO as processed
      await conn.query(
        `UPDATE rto_submissions SET is_inventory_updated = TRUE WHERE id = ?`,
        [id]
      );

      console.log(`✅ RTO ID ${id} processed successfully`);
    }

    // Step 8: Commit transaction
    await conn.commit();
    if (isPooledConnection) await conn.release();

    console.log(`✅ Inventory updated for ${goodRtos.length} RTO(s)`);

    // Step 9: Return summary + not found SKUs report
    return res.json({
      success: true,
      message: `Inventory updated for ${goodRtos.length - notFoundSKUs.length} RTO(s)`,
      totalUpdated: goodRtos.length - notFoundSKUs.length,
      totalNotFound: notFoundSKUs.length,
      notFoundSKUs,
    });
  } catch (err) {
    console.error("❌ Bulk inventory update failed:", err);

    if (conn) {
      try {
        await conn.rollback();
        console.log("🔁 Transaction rolled back");
      } catch (rollbackErr) {
        console.error("Rollback failed:", rollbackErr);
      }

      try {
        if (isPooledConnection && conn.release) await conn.release();
        else if (conn.end) await conn.end();
      } catch (releaseErr) {
        console.error("Connection release failed:", releaseErr);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update inventory",
      error: err.message,
    });
  }
};

// 3. Fetch Updated Inventories Data of RTOs History
// export const inventoryUpdate = async (req, res) => {
//   const db = dbPromise;
//   try {
//     const [rows] = await db.query("SELECT * FROM rto_data_to_master_inventory ORDER BY updatedAt DESC");
//     res.json({ success: true, data: rows });
//   } catch (err) {
//     console.error("❌ Fetch Inventory History Error:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// };

export const inventoryUpdate = async (req, res) => {
  const db = dbPromise;
  try {
    const [rows] = await db.query(`
      SELECT 
        r.*,
        m.sku AS meesho_sku
      FROM rto_data_to_master_inventory r
      LEFT JOIN meesho_rto_data m
        ON r.awb_number = m.awb_number
      ORDER BY r.updatedAt DESC
    `);

    res.json({ success: true, data: rows });

  } catch (err) {
    console.error("❌ Fetch Inventory History Error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

