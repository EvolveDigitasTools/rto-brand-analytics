import express from "express"
import { authorize } from "../authRoutes.js";
import { 
    getPendingClaims, 
    markClaimResolved, 
    getResolvedClaims, 
    getPendingNoClaimRTOs,
    updateRtoTicketId 
} from "../../controllers/rto-pending-claims/rtoPendingClaimsController.js";

const router = express.Router();
 
router.get("/rto/pending-claims", authorize(['admin', 'superadmin']), getPendingClaims); //Get All Pending Claims
router.put("/rto/mark-resolved/:id", authorize(['admin', 'superadmin']), markClaimResolved); // Update Pending Claim Status (Resolved)
router.get("/rto/resolved-claims", authorize(["admin", "superadmin"]), getResolvedClaims); // Get All Resolved Claims
router.get("/rto/pending-no-claims", authorize(["admin"]), getPendingNoClaimRTOs); // Get No Pending Claims (GlobalClaimReminder - Only for Admin) 
router.put("/rto/ticket-id/:id", authorize(["admin", "superadmin"]), updateRtoTicketId); // Update Ticket Id of Claim Raised RTOs

export default router;