import express from "express";
import { getRtoDataByAwb } from "../../controllers/get-rto-data-by-marketplaces/meeshoRtoDataController.js";
import { getAmazonRTOByOrderId } from "../../controllers/get-rto-data-by-marketplaces/amazonRtoDataController.js";
import { getFlipkartRTOByTrackingId } from "../../controllers/get-rto-data-by-marketplaces/flipkartRtoDataController.js";


const router = express.Router();

// Get RTO Data 
router.get("/meesho-rto/:awbId", getRtoDataByAwb);
router.get("/amazon-rto/:awbId", getAmazonRTOByOrderId);
router.get("/flipkart-rto/:awbId", getFlipkartRTOByTrackingId);

export default router;