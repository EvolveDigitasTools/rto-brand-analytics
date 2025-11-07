import express from "express";
import { authorize } from "./authRoutes.js";
import { getRTOOverview } from "../controllers/overviewRtoController.js";

const router = express.Router();

router.get("/rto/overview", authorize(['superadmin']), getRTOOverview);

export default router;