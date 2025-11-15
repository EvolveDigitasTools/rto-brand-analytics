import dbPromise from "../../db.js"

// Get Pending Claims
export const getPendingClaims = async (req, res) => {
  try {
    const db = await dbPromise;

    const [rows] = await db.query(`
      SELECT 
        id, marketplaces, pickup_partner, awb_id, order_id, sku_code, 
        product_title, item_condition, claim_raised, ticket_id, comments,
        created_at, created_by
      FROM rto_submissions
      WHERE LOWER(claim_raised) IN ('yes', 'no')
        AND (is_claim_resolved IS NULL OR is_claim_resolved = FALSE)
      ORDER BY created_at DESC
    `);

    return res.json({
      success: true,
      message: "Pending claim raised RTOs fetched successfully",
      data: rows,
    });
  } catch (err) {
    console.error("Error fetching pending claims:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending claims",
      error: err.message,
    });
  }
};

// Update Pending Claim Resolved
export const markClaimResolved = async (req, res) => {
  const { id } = req.params;
  const { ticket_id } = req.body;
  const userEmail = req.user?.email || "System";

  if (!id) {
    return res.status(400).json({ success: false, message: "RTO ID is required" });
  }

  if (!ticket_id || ticket_id.trim() === "") {
    return res.status(400).json({ success: false, message: "Ticket ID is required to mark claim resolved" });
  }

  let db;
  try {
    db = await dbPromise;

    // Check if the RTO exists and not already resolved
    const [rtoRows] = await db.query(
      `SELECT id FROM rto_submissions WHERE id = ? AND (is_claim_resolved IS NULL OR is_claim_resolved = FALSE)`,
      [id]
    );

    if (rtoRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "RTO not found or already resolved",
      });
    }

    // Update the record with Ticket ID, claim_raised, and resolution info
    const [result] = await db.query(
      `
      UPDATE rto_submissions
      SET 
        claim_raised = 'Yes',
        ticket_id = ?,
        is_claim_resolved = TRUE,
        resolved_at = NOW(),
        resolved_by = ?
      WHERE id = ?
      `,
      [ticket_id, userEmail, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Failed to mark claim resolved" });
    }

    res.json({
      success: true,
      message: "Claim marked as resolved successfully",
    });
  } catch (err) {
    console.error("❌ Error marking claim resolved:", err);
    res.status(500).json({
      success: false,
      message: "Server error while marking claim resolved",
      error: err.message,
    });
  }
};

// Get All Resolved Claims
export const getResolvedClaims = async (req, res) => {
  let db;
  try {
    db = await dbPromise;

    const [rows] = await db.query(`
      SELECT 
        id, marketplaces, pickup_partner, awb_id, order_id, sku_code, 
        product_title, item_condition, claim_raised, ticket_id, comments,
        created_at, created_by, is_claim_resolved, resolved_at, resolved_by
      FROM rto_submissions
      WHERE is_claim_resolved = TRUE
      ORDER BY resolved_at DESC
    `);

    return res.json({
      success: true,
      message: "Fetched resolved claims successfully",
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching resolved claims:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching resolved claims",
    });
  }
};

// Get Pending No Claim Raised (Popup Dialoge For Admin Only)
export const getPendingNoClaimRTOs = async (req, res) => {
  let db;
  try {
    db = await dbPromise;

    const [rows] = await db.query(`
      SELECT 
        id, marketplaces, awb_id, sku_code, product_title, created_at, claim_raised, ticket_id
      FROM rto_submissions
      WHERE LOWER(claim_raised) = 'no'
        AND (is_claim_resolved IS NULL OR is_claim_resolved = FALSE)
        AND DATE(created_at) <= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
      ORDER BY created_at ASC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Error fetching pending 'No' claim RTOs:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update Ticket Id of Claim Raised RTOs
export const updateRtoTicketId = async (req, res) => {
  const { id } = req.params;
  const { claim_raised, ticket_id } = req.body;
  const userEmail = req.user?.email || "System";

  if (!id) {
    return res.status(400).json({ success: false, message: "RTO ID is required" });
  }

  if (!ticket_id) {
    return res.status(400).json({ success: false, message: "Ticket ID is required" });
  }

  let db;
  try {
    db = await dbPromise;

    // 🧩 Step 1: Ensure RTO exists
    const [rtoRows] = await db.query(
      `SELECT id, item_condition FROM rto_submissions WHERE id = ?`,
      [id]
    );

    if (rtoRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "RTO not found (may already be processed or deleted)",
      });
    }

    // 🧩 Step 2: Update claim & mark as resolved (no inventory update)
    const [result] = await db.query(
      `UPDATE rto_submissions
       SET 
         claim_raised = ?,
         ticket_id = ?,
         is_claim_resolved = TRUE,
         resolved_at = NOW(),
         resolved_by = ?
       WHERE id = ?`,
      [claim_raised || "Yes", ticket_id, userEmail, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Failed to update claim" });
    }

    res.json({
      success: true,
      message: "Claim updated & marked resolved successfully",
    });
  } catch (err) {
    console.error("❌ Error updating RTO claim:", err);
    res.status(500).json({
      success: false,
      message: "Server error while updating claim",
      error: err.message,
    });
  }
};

