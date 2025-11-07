import express from "express"
import { authorize } from "./authRoutes.js";
import { getRTODataRoleBased, updateRTOData } from "../controllers/submittedRtoController.js";

const router = express.Router();

router.get("/rto", authorize(['user','admin','superadmin']), getRTODataRoleBased);
router.put("/rto/:id", updateRTOData);

export default router;