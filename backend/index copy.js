import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import serverless from "serverless-http";
import apiRoutes from "./routes/apiRoutes.js";
import authRoutes from "./routes/authRoutes.js"

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Force Access-Control headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  next();
});

app.use("/rtos", apiRoutes);
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("✅ Backend is running!");
});

// const PORT = process.env.PORT || 4000;

//Vercel does not need it _ Kept this for Local Testing
// if (process.env.PORT === process.env.PORT) {
//   app.listen(PORT, () => {
//     console.log(`Backend running on http://localhost:${PORT}`);
//   });
// }

export default serverless(app);