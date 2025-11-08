import express from "express";
import { uploadRtoSSE } from "../controllers/rto-upload/marketplacesRTOUploadController.js";

const router = express.Router();

router.post("/rto-upload", uploadRtoSSE);

export default router;  
