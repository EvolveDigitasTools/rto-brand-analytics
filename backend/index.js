import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./routes/apiRoutes.js";
import authRoutes from "./routes/authRoutes.js"

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use(cors({
//   origin: process.env.FRONTEND_URL,
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true
// }));

// ✅ Proper CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL,          // Allow only your frontend URL
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"], // ✅ Allow Authorization header
  credentials: true
};

app.use(cors(corsOptions));

// app.options("/*", cors(corsOptions));


//Force Access-Control-Allow-Origin
// app.options("*", (req, res) => {
//   res.header("Access-Control-Allow-Origin", process.env.FRONTEND_URL);
//   res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
//   res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
//   res.sendStatus(200);
// });

app.use("/api", apiRoutes);
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("✅ Backend is running!");
});

const PORT = process.env.PORT || 4000;


app.listen(PORT, () => {
    console.log(`Backend running on port http://localhost:${PORT}`);
});