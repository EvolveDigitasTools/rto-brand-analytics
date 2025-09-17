import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

let db;

async function initializeDatabase() {
  try {
    db = await mysql.createPool({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      port: Number(process.env.DATABASE_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Test the connection
    await db.query("SELECT 1");
    console.log("✅ Connected to MySQL database");
    return db;
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    throw err; // Rethrow to prevent exporting undefined db
  }
}

// Initialize database and export promise
export default initializeDatabase();