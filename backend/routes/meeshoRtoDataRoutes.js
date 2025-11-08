import express from "express";
import { getRtoDataByAwb } from "../controllers/meeshoRtoDataController.js";

const router = express.Router();

router.get("/meesho-rto/:awbNumber", getRtoDataByAwb);

export default router;