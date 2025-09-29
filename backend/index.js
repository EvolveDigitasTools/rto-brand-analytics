import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./routes/apiRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Proper CORS setup
const corsOptions = {
  origin: process.env.FRONTEND_URL || "https://rto.globalplugin.com", // Fallback if env missing
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],              // Include OPTIONS
  allowedHeaders: ["Content-Type", "Authorization"],                 // ✅ Allow Authorization header
  credentials: true
};

app.use(cors(corsOptions)); // ✅ Handles preflight automatically

// ❌ Remove manual Access-Control headers — they break cors()

// ✅ Routes
app.use("/api", apiRoutes);
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("✅ Backend is running!");
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend running on port http://localhost:${PORT}`);
});
