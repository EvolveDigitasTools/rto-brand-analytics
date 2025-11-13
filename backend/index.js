import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./routes/apiRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import submitRtoRoutes from "./routes/submitRtoRoutes.js";
import submittedRtoRoutes from "./routes/submittedRtoRoutes.js";
import deletedRtoRoutes from "./routes/deletedRtoRoutes.js";
import overviewRtoRoutes from "./routes/overviewRtoRoutes.js";
import marketplacesRtoUploadRoute from "./routes/marketplacesRtoUploadRoutes.js";
import meeshoRtoDataRoutes from "./routes/meeshoRtoDataRoutes.js";
import rtoToMasterInventoryRoutes from "./routes/rto-to-masterInventoryRoutes.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],              
  allowedHeaders: ["Content-Type", "Authorization"],                 
  credentials: true
};

app.use(cors(corsOptions));

app.use("/api", 
  apiRoutes, 
  submitRtoRoutes,
  submittedRtoRoutes,
  deletedRtoRoutes,
  overviewRtoRoutes,
  marketplacesRtoUploadRoute,
  meeshoRtoDataRoutes,
  rtoToMasterInventoryRoutes
);
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("✅ Backend is running!");
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
