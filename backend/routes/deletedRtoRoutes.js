import dbPromise from "../db.js";
import express from "express";
import { 
    saveDeletedRto, 
    getDeletedRtos, 
    restoreDeletedRto, 
    finalDeleteDeletedRto 
} from "../controllers/deletedRtoController.js";

const router = express.Router();

// Get Deleted RTOs Data for Deleted RTOs Page
router.get("/deleted-rtos", getDeletedRtos);

// Delete Part 2 - Send Record to Deleted RTOs table to Deleted RTOs Page from Submitted RTOs
router.post("/deleted-rtos", saveDeletedRto);

// Delete Part 2 - Delete from Submitted RTO data  
router.delete("/rto/:id", async (req, res) => {
  try {
    const db = await dbPromise;
    const { id } = req.params;
    await db.query("DELETE FROM rto_submissions WHERE id = ?", [id]);
    res.json({ success: true, message: "RTO deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Restore Deleted RTOs Data to Submitted RTOs
router.post("/deleted-rtos/restore/:id", restoreDeletedRto);

// Delete Part 3 - Final Delete from Deleted RTOs Page
router.delete("/deleted-rtos/:id", finalDeleteDeletedRto);


export default router