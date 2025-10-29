import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./routes/apiRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env"
});

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],              
  allowedHeaders: ["Content-Type", "Authorization"],                 
  credentials: true
};

app.use(cors(corsOptions));

app.use("/api", apiRoutes);
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("✅ Backend is running!");
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend running on port http://localhost:${PORT}`);
});
