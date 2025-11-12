import express from "express"
import { 
    goodRtoData, 
    updateInventoryFromRtoMultiple, 
    inventoryUpdate 
} from "../controllers/rto-to-masterInventory/rtoToMasterInventoryController.js";
import { authorize } from "./authRoutes.js";

const router = express.Router();

router.get("/rto-good", goodRtoData); // Fetch Good RTOs Data
router.post(
    "/update-from-rto-multiple", 
    authorize(["admin", "superadmin"]), 
    updateInventoryFromRtoMultiple
); //Update RTOs Data to Master Inventory
router.get("/inventory-updates", inventoryUpdate); // Fetch Updated Inventory Data of RTOs History

export default router;

