# 🛒 OlistMart — Full-Stack E-Commerce Platform

Built on the Olist Brazilian E-Commerce dataset with React frontend, Node.js/Express backend, MySQL database, and Claude AI integration.

---

## 🏗️ Architecture

```
olist-ecommerce/
├── frontend/          ← React app (App.jsx)
├── backend/           ← Node.js/Express API (server.js)
└── database/          ← MySQL setup scripts
```

---

## ⚡ Quick Start

### Step 1 — Database Setup

```bash
# 1. Open MySQL and create database
mysql -u root -p

# 2. Run setup script (update CSV paths inside the file first!)
mysql -u root -p < database/setup_database.sql
```

**Update CSV paths in `setup_database.sql`:**
Replace `/path/to/` with the actual path to your CSV files, e.g.:
```sql
LOAD DATA LOCAL INFILE '/home/user/data/customers.csv' ...
```

### Step 2 — Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL password and other credentials

npm install
npm start
# API runs at http://localhost:5000
```

### Step 3 — Frontend Setup

```bash
# Create a new React app
npx create-react-app olistmart-frontend
cd olistmart-frontend

# Replace src/App.js with the provided App.jsx
cp ../frontend/App.jsx src/App.js

npm start
# Frontend runs at http://localhost:3000
```

---

## 🔐 User Roles & Demo Login

| Role   | Email              | Password   |
|--------|--------------------|------------|
| User   | user@demo.com      | user123    |
| Seller | seller@demo.com    | seller123  |
| Admin  | admin@demo.com     | admin123   |

---

## 👤 User Features
- Browse & search products with filters (category, price, rating)
- Sort by price, rating, relevance, newest
- Product detail modal with delivery estimate
- Add to cart, manage quantities
- Favorites/wishlist
- Demo checkout with credit card / PIX / Boleto
- Write reviews & ratings
- AI-powered product recommendations (Claude)
- OTP verification on registration

## 🏪 Seller Features
- Inventory management with stock levels
- Low stock & depletion alerts
- Order management — see buyer info, ship orders
- Add/edit products with full details
- Sales analytics with revenue charts
- ML price trend insights

## 🛡️ Admin Features
- Platform-wide statistics dashboard
- Customer management (view, edit, deactivate)
- Seller management with revenue data
- Full order history with status tracking
- Price trend ML model (linear regression on historical data)
- Revenue charts by month/category
- Direct MySQL data modification
- Platform settings & integrations

---

## 🤖 ML & AI Features

### Price Trend Prediction
- **Algorithm:** Linear Regression on historical order prices per category
- **Endpoint:** `GET /api/ml/price-trend/:category`
- Predicts next 3 months' average prices based on Olist dataset

### Product Recommendations
- **Cold Start:** Popular products by rating × orders
- **Returning Users:** Content-based filtering by category history
- **Endpoint:** `GET /api/ml/recommendations`
- Also uses Claude AI for intelligent explanation of recommendations

### Claude AI Panel
- Powered by Anthropic's Claude claude-sonnet-4-20250514 model
- Analyzes cart + favorites → personalized product suggestions
- Accessible via the "AI" button in user dashboard

---

## 💳 Demo Payment System

Supports three payment methods:
1. **Credit Card** — Enter any 4242-xxxx card (0000 = decline)
2. **PIX** — Instant payment simulation
3. **Boleto Bancário** — Bank slip generation

All payments processed through demo endpoint `/api/payment/process`

---

## 📧 OTP Verification

### Email OTP
- Configure Gmail with App Passwords
- OTP sent on registration + shown in console for demo

### Phone OTP (SMS via Twilio)
- Sign up at twilio.com (free trial credit)
- Add credentials to `.env`
- Uncomment Twilio code in `server.js`

---

## 🗄️ MySQL Schema

The app creates these **additional** tables on top of the Olist dataset:

| Table       | Purpose                        |
|-------------|--------------------------------|
| users       | All user accounts (all roles)  |
| cart        | Shopping cart items            |
| favorites   | User wishlists                 |
| app_orders  | New orders placed via the app  |
| otp_logs    | OTP audit trail                |

---

## 🔌 API Endpoints

### Auth
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/send-otp
POST /api/auth/verify-otp
PUT  /api/auth/profile
```

### Products
```
GET /api/products?category=&search=&sort=&min_price=&max_price=&min_rating=&page=&limit=
GET /api/products/:id
GET /api/categories
GET /api/delivery-estimate?product_id=&customer_zip=
```

### Cart & Favorites
```
GET/POST      /api/cart
PUT/DELETE    /api/cart/:id
GET/POST      /api/favorites
DELETE        /api/favorites/:product_id
```

### Orders & Reviews
```
POST /api/orders
GET  /api/orders
POST /api/reviews
```

### Seller (requires seller token)
```
GET /api/seller/products
GET /api/seller/orders
GET /api/seller/stock-alerts
GET /api/seller/analytics
```

### Admin (requires admin token)
```
GET         /api/admin/stats
GET/PUT/DEL /api/admin/users/:id
GET         /api/admin/customers
GET         /api/admin/sellers
GET         /api/admin/orders
GET         /api/admin/price-trends?category=
GET         /api/admin/revenue-by-month
GET         /api/admin/top-categories
```

### ML & Payment
```
GET  /api/ml/recommendations
GET  /api/ml/price-trend/:category
POST /api/payment/process
```

---

## 🚀 Production Deployment

1. **Backend:** Deploy to AWS EC2 / DigitalOcean / Railway
2. **Database:** Use AWS RDS MySQL or PlanetScale
3. **Frontend:** Deploy to Vercel / Netlify
4. **Environment:** Set all `.env` variables in production
5. **JWT:** Use a strong random secret (32+ chars)
6. **OTP Store:** Replace in-memory store with Redis
7. **Email:** Use SendGrid / AWS SES for production email

---

## 📊 Dataset Attribution

This project uses the [Brazilian E-Commerce Public Dataset by Olist](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce) available on Kaggle under CC BY-NC-SA 4.0 license.
