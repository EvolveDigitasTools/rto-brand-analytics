import express from "express";
import { submitRto } from "../controllers/submitRtoController.js";

const router = express.Router();

router.post("/rto", submitRto);

export default router;