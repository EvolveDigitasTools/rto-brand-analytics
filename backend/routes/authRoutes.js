import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";

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
      
      const [users] = await db.query("SELECT id, name, email, role FROM rto_users WHERE id = ?", [decoded.id]);
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const user = users[0];
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({ success: false, message: "Unauthorized access" });
      }

      req.user = user; // Attach user to request
      next();
    } catch (err) {
      res.status(401).json({ success: false, message: "Invalid token" });
    }
  };
};

// 🟢 REGISTER (With role assignment)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }

    // Default to 'user' role if not specified, restrict 'admin' and 'superadmin' to authorized users
    const validRoles = ['user', 'admin', 'superadmin'];
    const userRole = validRoles.includes(role) ? role : 'user';

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO rto_users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, userRole]
    );

    res.json({ success: true, message: "User registered successfully" });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🟡 LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Missing email or password" });
    }

    const [users] = await db.query("SELECT * FROM rto_users WHERE email = ?", [email]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Create JWT with role
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "1d" });

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🟢 PROTECTED ROUTE EXAMPLE - User Profile
router.get("/me", authorize(['user', 'admin', 'superadmin']), async (req, res) => {
  res.json({ success: true, user: req.user });
});

// 🟢 ADMIN-ONLY ROUTE - List all users
router.get("/users", authorize(['admin', 'superadmin']), async (req, res) => {
  try {
    const [users] = await db.query("SELECT id, name, email, role FROM rto_users");
    res.json({ success: true, users });
  } catch (err) {
    console.error("Users List Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🟢 SUPERADMIN-ONLY ROUTE - Update user role
router.put("/users/:id/role", authorize(['superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = ['user', 'admin', 'superadmin'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const [result] = await db.query("UPDATE rto_users SET role = ? WHERE id = ?", [role, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User role updated successfully" });
  } catch (err) {
    console.error("Update Role Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;