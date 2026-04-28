// ============================================================
// OLIST E-COMMERCE PLATFORM - Complete Backend Server
// Stack: Node.js + Express + MySQL + JWT + ML (simple-statistics)
// ============================================================
// Run: npm install && node server.js
// ============================================================
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const { LinearRegression } = require("ml-regression");
const app = express();

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// ─── CONFIG ──────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "olist_secret_2024";
const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "your_mysql_password",
  database: process.env.DB_NAME || "olist_ecommerce",
  waitForConnections: true, connectionLimit: 10,
};

// Email (configure with real SMTP or use Nodemailer sandbox)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// Twilio SMS (configure with real credentials)
// const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

const pool = mysql.createPool(DB_CONFIG);
const otpStore = {}; // In-memory OTP store (use Redis in production)

// ─── AUTH MIDDLEWARE ─────────────────────────────────────────
const auth = (roles = []) => (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });
    const decoded = jwt.verify(token, JWT_SECRET);
    if (roles.length && !roles.includes(decoded.role))
      return res.status(403).json({ error: "Forbidden" });
    req.user = decoded;
    next();
  } catch { res.status(401).json({ error: "Invalid token" }); }
};

// ─── DATABASE SETUP ──────────────────────────────────────────
async function setupDatabase() {
  const conn = await pool.getConnection();
  try {
    // Users table (all roles)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('user','seller','admin') DEFAULT 'user',
        phone VARCHAR(20),
        city VARCHAR(100),
        state VARCHAR(10),
        zip_code VARCHAR(10),
        street TEXT,
        email_verified BOOLEAN DEFAULT FALSE,
        phone_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Cart table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS cart (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36),
        product_id VARCHAR(64),
        qty INT DEFAULT 1,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Favorites table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        user_id VARCHAR(36),
        product_id VARCHAR(64),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, product_id)
      )
    `);

    // App orders table (maps to orders)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS app_orders (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        order_id VARCHAR(64),
        user_id VARCHAR(36),
        product_ids JSON,
        total_value DECIMAL(10,2),
        payment_type VARCHAR(50),
        installments INT DEFAULT 1,
        delivery_address TEXT,
        status ENUM('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // OTP log table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS otp_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        identifier VARCHAR(255),
        otp VARCHAR(10),
        type ENUM('email','phone'),
        expires_at TIMESTAMP,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed admin user
    const [admins] = await conn.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
    if (!admins.length) {
      const hash = await bcrypt.hash("admin123", 12);
      await conn.query("INSERT INTO users (name,email,password,role,email_verified) VALUES (?,?,?,?,?)",
        ["Admin Master","admin@demo.com",hash,"admin",true]);
    }

    console.log("✅ Database schema ready");
  } finally { conn.release(); }
}

// ─── ML: PRICE TREND PREDICTION ──────────────────────────────
async function getPriceTrend(category) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        MONTH(o.order_purchase_timestamp) as month,
        YEAR(o.order_purchase_timestamp) as year,
        AVG(oi.price) as avg_price
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN products p ON oi.product_id = p.product_id
      LEFT JOIN category_translation t ON p.product_category_name = t.product_category_name
      WHERE (t.product_category_name_english = ? OR p.product_category_name = ?)
        AND o.order_purchase_timestamp IS NOT NULL
      GROUP BY year, month
      ORDER BY year, month
      LIMIT 24
    `, [category, category]);

    if (rows.length < 3) return null;

    const x = rows.map((_, i) => i);
    const y = rows.map(r => parseFloat(r.avg_price));

    // Simple linear regression for trend
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
    const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict next 3 months
    const predictions = [1, 2, 3].map(i => ({
      month: i,
      predicted_price: +(slope * (n + i - 1) + intercept).toFixed(2),
    }));

    return { historical: rows, trend: slope > 0 ? "rising" : "falling", predictions };
  } catch (e) {
    console.error("ML error:", e.message);
    return null;
  }
}

// ─── ML: PRODUCT RECOMMENDATIONS ─────────────────────────────
async function getRecommendations(userId, limit = 5) {
  try {
    // Collaborative filtering: find users with similar purchase patterns
    const [userOrders] = await pool.query(`
      SELECT DISTINCT oi.product_id
      FROM app_orders ao
      JOIN order_items oi ON JSON_CONTAINS(ao.product_ids, JSON_QUOTE(oi.product_id))
      WHERE ao.user_id = ?
      LIMIT 20
    `, [userId]);

    if (!userOrders.length) {
      // Cold start: return popular products
      const [popular] = await pool.query(`
        SELECT p.product_id, p.product_category_name, 
               AVG(r.review_score) as avg_rating,
               COUNT(oi.order_id) as order_count,
               AVG(oi.price) as avg_price
        FROM products p
        JOIN order_items oi ON p.product_id = oi.product_id
        LEFT JOIN order_reviews r ON oi.order_id = r.order_id
        GROUP BY p.product_id
        ORDER BY avg_rating DESC, order_count DESC
        LIMIT ?
      `, [limit]);
      return popular;
    }

    // Content-based: find products from same categories
    const productIds = userOrders.map(r => r.product_id);
    const [categories] = await pool.query(`
      SELECT DISTINCT product_category_name 
      FROM products 
      WHERE product_id IN (?)
    `, [productIds]);

    const catNames = categories.map(c => c.product_category_name);
    const [recs] = await pool.query(`
      SELECT p.product_id, p.product_category_name,
             AVG(r.review_score) as avg_rating,
             COUNT(oi.order_id) as purchase_count,
             AVG(oi.price) as avg_price
      FROM products p
      JOIN order_items oi ON p.product_id = oi.product_id
      LEFT JOIN order_reviews r ON oi.order_id = r.order_id
      WHERE p.product_category_name IN (?)
        AND p.product_id NOT IN (?)
      GROUP BY p.product_id
      HAVING avg_rating >= 4
      ORDER BY purchase_count DESC, avg_rating DESC
      LIMIT ?
    `, [catNames, productIds, limit]);

    return recs;
  } catch (e) {
    console.error("Recommendations error:", e.message);
    return [];
  }
}

// ─── OTP HELPERS ─────────────────────────────────────────────
function generateOtp() { return Math.floor(100000 + Math.random() * 900000).toString(); }

async function sendEmailOtp(email, otp) {
  // In production, use real email
  console.log(`📧 OTP for ${email}: ${otp}`);
  try {
    await transporter.sendMail({
      from: '"OlistMart" <noreply@olistmart.com>',
      to: email,
      subject: "Your OlistMart Verification Code",
      html: `<div style="font-family:sans-serif;padding:30px;background:#f8fafc;border-radius:12px">
        <h2 style="color:#1e40af">OlistMart Verification</h2>
        <p>Your OTP code is:</p>
        <div style="font-size:36px;font-weight:bold;color:#1e40af;letter-spacing:8px;padding:20px 0">${otp}</div>
        <p style="color:#6b7280;font-size:13px">Expires in 10 minutes. Don't share this code.</p>
      </div>`
    });
  } catch (e) { console.log("Email send skipped (no SMTP configured):", e.message); }
}

async function sendSmsOtp(phone, otp) {
  console.log(`📱 SMS OTP for ${phone}: ${otp}`);
  // Uncomment when Twilio is configured:
  // await twilioClient.messages.create({ body: `Your OlistMart OTP: ${otp}`, from: process.env.TWILIO_FROM, to: phone });
}

// ─── AUTH ROUTES ──────────────────────────────────────────────
app.post("/api/auth/send-otp", async (req, res) => {
  const { identifier, type } = req.body; // type: 'email' | 'phone'
  if (!identifier) return res.status(400).json({ error: "Identifier required" });

  const otp = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await pool.query(
    "INSERT INTO otp_logs (identifier, otp, type, expires_at) VALUES (?,?,?,?)",
    [identifier, otp, type, expires]
  );

  if (type === "email") await sendEmailOtp(identifier, otp);
  else await sendSmsOtp(identifier, otp);

  res.json({ message: "OTP sent", expires: expires.toISOString() });
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { identifier, otp } = req.body;
  const [rows] = await pool.query(
    "SELECT * FROM otp_logs WHERE identifier=? AND otp=? AND used=FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
    [identifier, otp]
  );
  if (!rows.length) return res.status(400).json({ error: "Invalid or expired OTP" });
  await pool.query("UPDATE otp_logs SET used=TRUE WHERE id=?", [rows[0].id]);
  res.json({ verified: true });
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, role = "user", phone, city, state, zip_code, street } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Required fields missing" });

  try {
    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      "INSERT INTO users (name,email,password,role,phone,city,state,zip_code,street) VALUES (?,?,?,?,?,?,?,?,?)",
      [name, email, hash, role, phone, city, state, zip_code, street]
    );
    const token = jwt.sign({ id: result.insertId, email, role, name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: result.insertId, name, email, role } });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Email already registered" });
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const [users] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
  if (!users.length) return res.status(401).json({ error: "Invalid credentials" });

  const user = users[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET, { expiresIn: "7d" }
  );
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

app.get("/api/auth/me", auth(), async (req, res) => {
  const [users] = await pool.query("SELECT id,name,email,role,phone,city,state,zip_code,street,email_verified,phone_verified FROM users WHERE id=?", [req.user.id]);
  if (!users.length) return res.status(404).json({ error: "User not found" });
  res.json(users[0]);
});

app.put("/api/auth/profile", auth(), async (req, res) => {
  const { name, phone, city, state, zip_code, street } = req.body;
  await pool.query(
    "UPDATE users SET name=?,phone=?,city=?,state=?,zip_code=?,street=? WHERE id=?",
    [name, phone, city, state, zip_code, street, req.user.id]
  );
  res.json({ message: "Profile updated" });
});

// ─── PRODUCTS ROUTES ──────────────────────────────────────────
app.get("/api/products", async (req, res) => {
  const { category, search, sort = "relevance", min_price = 0, max_price = 999999, min_rating = 0, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT 
      p.product_id,
      p.product_category_name,
      COALESCE(t.product_category_name_english, p.product_category_name) as category_en,
      p.product_name_length,
      p.product_weight_g,
      p.product_photos_qty,
      COALESCE(AVG(oi.price), 0) as price,
      COALESCE(AVG(oi.freight_value), 0) as freight_value,
      COALESCE(AVG(r.review_score), 0) as rating,
      COUNT(DISTINCT r.review_id) as review_count,
      COUNT(DISTINCT oi.order_id) as total_orders
    FROM products p
    LEFT JOIN order_items oi ON p.product_id = oi.product_id
    LEFT JOIN order_reviews r ON oi.order_id = r.order_id
    LEFT JOIN category_translation t ON p.product_category_name = t.product_category_name
    WHERE 1=1
  `;
  const params = [];

  if (category && category !== "all") {
    query += " AND (t.product_category_name_english=? OR p.product_category_name=?)";
    params.push(category, category);
  }
  if (search) {
    query += " AND p.product_category_name LIKE ?";
    params.push(`%${search}%`);
  }

  query += " GROUP BY p.product_id, p.product_category_name, t.product_category_name_english, p.product_name_length, p.product_weight_g, p.product_photos_qty";
  query += " HAVING price BETWEEN ? AND ?";
  params.push(+min_price || 0, +max_price || 999999);

  if (min_rating > 0) { query += " AND rating >= ?"; params.push(min_rating); }

  const sortMap = {
    price_asc: "price ASC", price_desc: "price DESC",
    rating: "rating DESC", newest: "p.product_id DESC",
    relevance: "total_orders DESC, rating DESC",
  };
  query += ` ORDER BY ${sortMap[sort] || sortMap.relevance}`;
  query += " LIMIT ? OFFSET ?";
  params.push(+limit, +offset);

  try {
    const [products] = await pool.query(query, params);
    const [[{ total }]] = await pool.query("SELECT COUNT(DISTINCT product_id) as total FROM products");
    res.json({ products, pagination: { page: +page, limit: +limit, total } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const [[product]] = await pool.query(`
      SELECT p.*, 
             COALESCE(t.product_category_name_english, p.product_category_name) as category_en,
             AVG(oi.price) as price, AVG(oi.freight_value) as freight_value,
             AVG(r.review_score) as rating, COUNT(DISTINCT r.review_id) as review_count,
             s.seller_city, s.seller_state
      FROM products p
      LEFT JOIN order_items oi ON p.product_id = oi.product_id
      LEFT JOIN sellers s ON oi.seller_id = s.seller_id
      LEFT JOIN order_reviews r ON oi.order_id = r.order_id
      LEFT JOIN category_translation t ON p.product_category_name = t.product_category_name
      WHERE p.product_id=? GROUP BY p.product_id
    `, [req.params.id]);

    const [reviews] = await pool.query(`
      SELECT r.review_score, r.review_comment_title, r.review_comment_message, r.review_creation_date
      FROM order_reviews r
      JOIN order_items oi ON r.order_id = oi.order_id
      WHERE oi.product_id=? AND r.review_comment_message IS NOT NULL
      ORDER BY r.review_creation_date DESC LIMIT 20
    `, [req.params.id]);

    res.json({ ...product, reviews });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/categories", async (req, res) => {
  const [rows] = await pool.query(`
    SELECT t.product_category_name_english as category, COUNT(*) as count
    FROM products p
    LEFT JOIN category_translation t ON p.product_category_name = t.product_category_name
    GROUP BY t.product_category_name_english
    ORDER BY count DESC
  `);
  res.json(rows);
});

// ─── DELIVERY ESTIMATE ────────────────────────────────────────
app.get("/api/delivery-estimate", async (req, res) => {
  const { product_id, customer_zip } = req.query;
  try {
    const [[stats]] = await pool.query(`
      SELECT 
        AVG(DATEDIFF(o.order_delivered_customer_date, o.order_purchase_timestamp)) as avg_days,
        MIN(DATEDIFF(o.order_delivered_customer_date, o.order_purchase_timestamp)) as min_days,
        MAX(DATEDIFF(o.order_delivered_customer_date, o.order_purchase_timestamp)) as max_days
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      WHERE oi.product_id = ? AND o.order_status = 'delivered'
        AND o.order_delivered_customer_date IS NOT NULL
    `, [product_id]);

    const avg = Math.round(stats.avg_days) || 7;
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + avg);

    res.json({
      estimated_days: avg,
      min_days: stats.min_days || avg - 2,
      max_days: stats.max_days || avg + 3,
      delivery_date: deliveryDate.toISOString().split("T")[0],
      freight_estimate: 15.00,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── CART ROUTES ──────────────────────────────────────────────
app.get("/api/cart", auth(["user"]), async (req, res) => {
  const [items] = await pool.query(`
    SELECT c.id, c.product_id, c.qty,
           COALESCE(AVG(oi.price), 0) as price,
           COALESCE(AVG(oi.freight_value), 0) as freight_value,
           p.product_category_name
    FROM cart c
    LEFT JOIN products p ON c.product_id = p.product_id
    LEFT JOIN order_items oi ON c.product_id = oi.product_id
    WHERE c.user_id=?
    GROUP BY c.id, c.product_id, c.qty, p.product_category_name
  `, [req.user.id]);
  res.json(items);
});

app.post("/api/cart", auth(["user"]), async (req, res) => {
  const { product_id, qty = 1 } = req.body;
  const [existing] = await pool.query("SELECT id FROM cart WHERE user_id=? AND product_id=?", [req.user.id, product_id]);
  if (existing.length) {
    await pool.query("UPDATE cart SET qty=qty+? WHERE id=?", [qty, existing[0].id]);
  } else {
    await pool.query("INSERT INTO cart (user_id, product_id, qty) VALUES (?,?,?)", [req.user.id, product_id, qty]);
  }
  res.json({ message: "Added to cart" });
});

app.put("/api/cart/:id", auth(["user"]), async (req, res) => {
  const { qty } = req.body;
  if (qty <= 0) await pool.query("DELETE FROM cart WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
  else await pool.query("UPDATE cart SET qty=? WHERE id=? AND user_id=?", [qty, req.params.id, req.user.id]);
  res.json({ message: "Updated" });
});

app.delete("/api/cart/:id", auth(["user"]), async (req, res) => {
  await pool.query("DELETE FROM cart WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
  res.json({ message: "Removed" });
});

// ─── FAVORITES ROUTES ─────────────────────────────────────────
app.get("/api/favorites", auth(["user"]), async (req, res) => {
  const [rows] = await pool.query("SELECT product_id FROM favorites WHERE user_id=?", [req.user.id]);
  res.json(rows.map(r => r.product_id));
});

app.post("/api/favorites/:product_id", auth(["user"]), async (req, res) => {
  try {
    await pool.query("INSERT IGNORE INTO favorites (user_id, product_id) VALUES (?,?)", [req.user.id, req.params.product_id]);
    res.json({ message: "Added to favorites" });
  } catch { res.status(500).json({ error: "Failed" }); }
});

app.delete("/api/favorites/:product_id", auth(["user"]), async (req, res) => {
  await pool.query("DELETE FROM favorites WHERE user_id=? AND product_id=?", [req.user.id, req.params.product_id]);
  res.json({ message: "Removed from favorites" });
});

// ─── ORDERS ROUTES ────────────────────────────────────────────
app.post("/api/orders", auth(["user"]), async (req, res) => {
  const { product_ids, payment_type, installments = 1, delivery_address, total_value } = req.body;
  try {
    const orderId = `ORD-${Date.now()}`;
    const [result] = await pool.query(
      "INSERT INTO app_orders (order_id, user_id, product_ids, total_value, payment_type, installments, delivery_address) VALUES (?,?,?,?,?,?,?)",
      [orderId, req.user.id, JSON.stringify(product_ids), total_value, payment_type, installments, JSON.stringify(delivery_address)]
    );

    // Clear cart after order
    await pool.query("DELETE FROM cart WHERE user_id=?", [req.user.id]);

    // Send confirmation email
    await transporter.sendMail({
      from: '"OlistMart" <orders@olistmart.com>',
      to: req.user.email,
      subject: `Order Confirmed - ${orderId}`,
      html: `<h2>Order Confirmed!</h2><p>Order ID: <strong>${orderId}</strong></p><p>Total: R$ ${total_value}</p>`,
    }).catch(() => {});

    res.json({ order_id: orderId, message: "Order placed successfully" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/orders", auth(["user"]), async (req, res) => {
  const [orders] = await pool.query("SELECT * FROM app_orders WHERE user_id=? ORDER BY created_at DESC", [req.user.id]);
  res.json(orders);
});

// ─── REVIEWS ROUTES ───────────────────────────────────────────
app.post("/api/reviews", auth(["user"]), async (req, res) => {
  const { order_id, review_score, review_comment_title, review_comment_message } = req.body;
  try {
    const reviewId = require("crypto").randomUUID();
    await pool.query(
      "INSERT INTO order_reviews (review_id, order_id, review_score, review_comment_title, review_comment_message, review_creation_date, review_answer_timestamp) VALUES (?,?,?,?,?,NOW(),NOW())",
      [reviewId, order_id, review_score, review_comment_title, review_comment_message]
    );
    res.json({ review_id: reviewId, message: "Review submitted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SELLER ROUTES ────────────────────────────────────────────
app.get("/api/seller/products", auth(["seller"]), async (req, res) => {
  const [rows] = await pool.query(`
    SELECT p.*,
           COALESCE(t.product_category_name_english, p.product_category_name) as category_en,
           AVG(oi.price) as price, AVG(oi.freight_value) as freight_value,
           AVG(r.review_score) as rating, COUNT(DISTINCT r.review_id) as review_count,
           COUNT(DISTINCT oi.order_id) as total_orders
    FROM products p
    JOIN order_items oi ON p.product_id = oi.product_id
    JOIN sellers s ON oi.seller_id = s.seller_id
    LEFT JOIN order_reviews r ON oi.order_id = r.order_id
    LEFT JOIN category_translation t ON p.product_category_name = t.product_category_name
    WHERE s.seller_id = (SELECT seller_id FROM sellers LIMIT 1)
    GROUP BY p.product_id
    LIMIT 50
  `);
  res.json(rows);
});

app.get("/api/seller/orders", auth(["seller"]), async (req, res) => {
  const [rows] = await pool.query(`
    SELECT o.order_id, o.order_status, o.order_purchase_timestamp,
           o.order_estimated_delivery_date,
           c.customer_city, c.customer_state,
           oi.price, oi.freight_value, p.product_category_name
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    JOIN sellers s ON oi.seller_id = s.seller_id
    JOIN products p ON oi.product_id = p.product_id
    LEFT JOIN customers c ON o.customer_id = c.customer_id
    WHERE oi.seller_id = (SELECT seller_id FROM sellers LIMIT 1)
    ORDER BY o.order_purchase_timestamp DESC
    LIMIT 100
  `);
  res.json(rows);
});

app.get("/api/seller/stock-alerts", auth(["seller"]), async (req, res) => {
  // Derive stock from order patterns (since olist doesn't have inventory table)
  const [rows] = await pool.query(`
    SELECT p.product_id, p.product_category_name,
           COUNT(oi.order_id) as total_sold,
           GREATEST(0, 100 - COUNT(oi.order_id)) as estimated_stock,
           AVG(oi.price) as price
    FROM products p
    JOIN order_items oi ON p.product_id = oi.product_id
    GROUP BY p.product_id
    HAVING estimated_stock < 20
    ORDER BY estimated_stock ASC
    LIMIT 20
  `);
  res.json(rows);
});

app.get("/api/seller/analytics", auth(["seller"]), async (req, res) => {
  const [revenue] = await pool.query(`
    SELECT 
      DATE_FORMAT(o.order_purchase_timestamp, '%Y-%m') as month,
      SUM(oi.price) as revenue,
      COUNT(DISTINCT o.order_id) as orders,
      AVG(r.review_score) as avg_rating
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    LEFT JOIN order_reviews r ON o.order_id = r.order_id
    WHERE oi.seller_id = (SELECT seller_id FROM sellers LIMIT 1)
    GROUP BY month ORDER BY month DESC LIMIT 12
  `);
  res.json(revenue.reverse());
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────
app.get("/api/admin/stats", auth(["admin"]), async (req, res) => {
  const [[orders]] = await pool.query("SELECT COUNT(*) as total, SUM(payment_value) as revenue FROM order_payments");
  const [[customers]] = await pool.query("SELECT COUNT(*) as total FROM customers");
  const [[sellers]] = await pool.query("SELECT COUNT(*) as total FROM sellers");
  const [[products]] = await pool.query("SELECT COUNT(*) as total FROM products");
  const [[avgRating]] = await pool.query("SELECT AVG(review_score) as avg FROM order_reviews");
  res.json({ orders, customers, sellers, products, avg_rating: avgRating.avg });
});

app.get("/api/admin/customers", auth(["admin"]), async (req, res) => {
  const { page = 1, limit = 50, search } = req.query;
  let q = "SELECT * FROM customers WHERE 1=1";
  const params = [];
  if (search) { q += " AND customer_city LIKE ?"; params.push(`%${search}%`); }
  q += " LIMIT ? OFFSET ?";
  params.push(+limit, (+page - 1) * limit);
  const [rows] = await pool.query(q, params);
  res.json(rows);
});

app.get("/api/admin/sellers", auth(["admin"]), async (req, res) => {
  const [rows] = await pool.query(`
    SELECT s.*,
           COUNT(DISTINCT oi.product_id) as product_count,
           SUM(oi.price) as total_revenue,
           AVG(r.review_score) as avg_rating,
           COUNT(DISTINCT o.order_id) as total_orders
    FROM sellers s
    LEFT JOIN order_items oi ON s.seller_id = oi.seller_id
    LEFT JOIN orders o ON oi.order_id = o.order_id
    LEFT JOIN order_reviews r ON o.order_id = r.order_id
    GROUP BY s.seller_id
    ORDER BY total_revenue DESC LIMIT 100
  `);
  res.json(rows);
});

app.get("/api/admin/users", auth(["admin"]), async (req, res) => {
  const [rows] = await pool.query("SELECT id,name,email,role,phone,city,state,created_at FROM users ORDER BY created_at DESC");
  res.json(rows);
});

app.put("/api/admin/users/:id", auth(["admin"]), async (req, res) => {
  const { name, email, role, phone, city, state } = req.body;
  await pool.query("UPDATE users SET name=?,email=?,role=?,phone=?,city=?,state=? WHERE id=?",
    [name, email, role, phone, city, state, req.params.id]);
  res.json({ message: "User updated" });
});

app.delete("/api/admin/users/:id", auth(["admin"]), async (req, res) => {
  await pool.query("DELETE FROM users WHERE id=? AND role != 'admin'", [req.params.id]);
  res.json({ message: "User deleted" });
});

app.get("/api/admin/orders", auth(["admin"]), async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  let q = "SELECT o.*, p.payment_value, p.payment_type FROM orders o LEFT JOIN order_payments p ON o.order_id = p.order_id WHERE 1=1";
  const params = [];
  if (status) { q += " AND o.order_status=?"; params.push(status); }
  q += " ORDER BY o.order_purchase_timestamp DESC LIMIT ? OFFSET ?";
  params.push(+limit, (+page - 1) * limit);
  const [rows] = await pool.query(q, params);
  res.json(rows);
});

app.get("/api/admin/price-trends", auth(["admin"]), async (req, res) => {
  const { category } = req.query;
  const trend = await getPriceTrend(category || "health_beauty");
  res.json(trend);
});

app.get("/api/admin/revenue-by-month", auth(["admin"]), async (req, res) => {
  const [rows] = await pool.query(`
    SELECT 
      DATE_FORMAT(o.order_purchase_timestamp, '%Y-%m') as month,
      SUM(p.payment_value) as revenue,
      COUNT(DISTINCT o.order_id) as orders,
      COUNT(DISTINCT o.customer_id) as unique_customers
    FROM orders o
    JOIN order_payments p ON o.order_id = p.order_id
    WHERE o.order_purchase_timestamp IS NOT NULL
    GROUP BY month ORDER BY month ASC
  `);
  res.json(rows);
});

app.get("/api/admin/top-categories", auth(["admin"]), async (req, res) => {
  const [rows] = await pool.query(`
    SELECT 
      COALESCE(t.product_category_name_english, pr.product_category_name) as category,
      SUM(oi.price) as revenue,
      COUNT(DISTINCT oi.order_id) as orders,
      AVG(r.review_score) as avg_rating
    FROM order_items oi
    JOIN products pr ON oi.product_id = pr.product_id
    LEFT JOIN category_translation t ON pr.product_category_name = t.product_category_name
    LEFT JOIN order_reviews r ON oi.order_id = r.order_id
    GROUP BY category ORDER BY revenue DESC LIMIT 15
  `);
  res.json(rows);
});

// ─── ML ROUTES ────────────────────────────────────────────────
app.get("/api/ml/recommendations", auth(["user"]), async (req, res) => {
  const recs = await getRecommendations(req.user.id);
  res.json(recs);
});

app.get("/api/ml/price-trend/:category", async (req, res) => {
  const trend = await getPriceTrend(req.params.category);
  res.json(trend);
});

// ─── PAYMENT DEMO ROUTE ───────────────────────────────────────
app.post("/api/payment/process", auth(["user"]), async (req, res) => {
  const { amount, payment_type, card_number, installments } = req.body;

  // Demo payment simulation
  await new Promise(r => setTimeout(r, 1500)); // Simulate processing

  if (payment_type === "credit_card") {
    const lastFour = card_number?.slice(-4) || "4242";
    if (lastFour === "0000") return res.status(402).json({ error: "Card declined" });
  }

  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  res.json({
    success: true,
    transaction_id: transactionId,
    amount,
    payment_type,
    installments,
    status: "approved",
    message: payment_type === "pix" ? "PIX payment confirmed" : payment_type === "boleto" ? "Boleto generated" : "Payment approved",
  });
});

// ─── START SERVER ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

setupDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 OlistMart API running on http://localhost:${PORT}`);
      console.log(`📊 MySQL: ${DB_CONFIG.host}/${DB_CONFIG.database}`);
      console.log(`\n📋 Routes:`);
      console.log(`   POST /api/auth/register, /api/auth/login`);
      console.log(`   GET  /api/products, /api/products/:id, /api/categories`);
      console.log(`   POST /api/orders, GET /api/orders`);
      console.log(`   GET  /api/seller/*, /api/admin/*`);
      console.log(`   GET  /api/ml/recommendations, /api/ml/price-trend/:category\n`);
    });
  })
  .catch(e => console.error("❌ Database setup failed:", e.message));
