import db from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

// REGISTER (With role assignment)
export const Register = async (req, res) => {
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
};

// LOGIN
export const Login = async (req, res) => {
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
};

// DELETE USER - Only superadmin
export const deleteUser = async (req, res) => {
    const userId = req.params.id;

  try {
    if (req.user.role === 'superadmin' && req.user.id === Number(userId)) {
      return res.status(400).json({ success: false, message: "Superadmin cannot delete themselves" });
    }

    const [result] = await db.query("DELETE FROM rto_users WHERE id = ?", [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete User Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// For Superadmin Only - UPDATE USERS ROLE 
export const updateUser = async (req, res) => {
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
}