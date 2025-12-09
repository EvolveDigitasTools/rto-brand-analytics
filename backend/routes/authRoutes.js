import express from "express";
import jwt from "jsonwebtoken";
import db from "../db.js";
import { Register, Login, deleteUser, updateUser } from "../controllers/authController.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify token and role
const authorize = (roles = []) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const [users] = await db.query("SELECT id, name, email, role FROM all_users WHERE id = ?", [decoded.id]);
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const user = users[0];
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({ success: false, message: "Unauthorized access" });
      }

      req.user = user;
      next();
    } catch (err) {
      res.status(401).json({ success: false, message: "Invalid token" });
    }
  };
};

// 🟢 REGISTER (With role assignment)
router.post("/register", Register)

// 🟡 LOGIN
router.post("/login", Login )

// 🟢 PROTECTED ROUTE EXAMPLE - User Profile
router.get("/me", authorize(['user', 'admin', 'superadmin']), async (req, res) => {
  res.json({ success: true, user: req.user });
});

// 🟢 ADMIN-ONLY ROUTE - List all users
router.get("/users", authorize(['admin', 'superadmin']), async (req, res) => {
  try {
    const [users] = await db.query("SELECT id, name, email, role, created_at FROM all_users");
    res.json({ success: true, users });
  } catch (err) {
    console.error("Users List Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🟢 DELETE USER - Only superadmin 
router.delete("/users/:id", authorize(["superadmin"]), deleteUser);

// SUPERADMIN-ONLY ROUTE - Update user role
router.put("/users/:id/role", authorize(["superadmin"]), updateUser);

export default router;
export { authorize };