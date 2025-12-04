import express from 'express';
import { authorize } from './authRoutes.js';
import { 
    fetchMonthlyRtoData, 
    fetchMonthlyRtoBreakdown
} from '../controllers/monthlyRtoDataController.js';
const router = express.Router();

router.get('/monthly-rto-data', authorize(['admin', 'superadmin']), fetchMonthlyRtoData); // Fetch Monthly RTO Data % Based
router.get("/monthly-rto-breakdown", authorize(['admin', 'superadmin']), fetchMonthlyRtoBreakdown); // Fetch Monthly RTO Breakdown Data

export default router;
