import express from "express";
import { uploadMeeshoSSE } from "../controllers/marketplacesRtoUploadController.js";

const router = express.Router();

router.post("/meesho-sse", uploadMeeshoSSE);

export default router;
