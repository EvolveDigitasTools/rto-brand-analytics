import express from "express";
import { getVendors, getPoCodes, getSkuByCode } from "../controllers/apiController.js";

const router = express.Router();

// Route with type param for flexibility
router.get("/", async (req, res) => {
  const { type } = req.query;

  switch (type) {
    case "vendors":
      return getVendors(req, res);
    case "po-codes":
      return getPoCodes(req, res);
    case "skuCode":
      return getSkuByCode(req, res);
    default:  
      return res.status(400).json({ message: "Invalid type parameter" });
  }
});

export default router;
