import express from "express";
import { getRtoDataByAwb } from "../controllers/meeshoRtoDataController.js";

const router = express.Router();

router.get("/meesho-rto/:awbId", getRtoDataByAwb);

export default router;