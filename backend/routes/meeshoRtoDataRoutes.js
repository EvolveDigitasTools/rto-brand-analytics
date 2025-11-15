import express from "express";
import { getRtoDataByAwb } from "../controllers/meeshoRtoDataController.js";

const router = express.Router();

// Get Meesho RTO Data by AWB Id
router.get("/meesho-rto/:awbId", getRtoDataByAwb);

export default router;