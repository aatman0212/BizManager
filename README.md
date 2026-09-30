# BizManager — Business Management System

A comprehensive, production-ready, multi-tenant business management web application for retail and wholesale businesses to manage **Customers**, **Stock Inventory**, **Multi-item POS Billing**, **1-Click SMS Messaging**, and **Downloadable PDF Invoices**.

---

## 🌟 Key Features

### 1. 👥 Customer Management & Purchase History
- **Complete Customer Profiles**: Store Customer Name, Phone Number, Email, Address, GSTIN / Tax ID, and internal notes/tags.
- **Purchase History Drawer**: Expand any customer row to inspect all historical multi-item invoices, item breakdown, payment status, and balances.
- **Pending Balances Filter**: 1-click filter to instantly view all customers with outstanding credit/dues.

### 2. 📱 1-Click SMS Messaging
- **Dual Send Modes**:
  1. **Direct 1-Click Native SMS (`sms:` protocol)**: Instantly opens the device's native SMS app (Android Messages / Apple iMessage / Windows SMS) with customer number and pre-filled message text with zero setup cost.
  2. **Automated SMS Gateway API**: Built-in backend SMS gateway supporting **Fast2SMS** (India), **Twilio** (Global), and an **Instant Built-in Simulator** with full delivery audit logs.
- **Template Presets**:
  - 💳 *Payment Due Reminder* (interpolates customer name and pending balance).
  - 🧾 *Invoice / Bill Receipt* (interpolates invoice #, grand total, paid, and balance).
  - 🙏 *Customer Thank You Note*
  - 🎁 *Festive / Promotional Discount Offer*
  - ✍️ *Custom SMS Message* with real-time character & segment counter.

### 3. 📦 Stock & Inventory Management with Low-Stock Alerts
- **Product Catalog**: SKU/Barcode auto-generation, Category tags, Unit of measurement (`pcs`, `kg`, `box`, `pkt`, `meter`, `ltr`, `pair`, `set`), Cost Price, Selling Price, and Stock Quantity.
- **Real-Time Low Stock Warning Banner**: Prominently highlights items reaching or falling below their configurable threshold limit.
- **1-Click Restock**: Add stock with supplier details and notes; auto-updates inventory and logs movement in the audit trail.
- **Stock Movement Logs**: Full audit trail recording initial intake, sales deductions, restocks, and invoice cancellations.

### 4. 🧾 Multi-Item POS Billing & Selling History
- **Interactive POS Workstation**:
  - Live product catalog search, category filtering, and 1-click "+ Add to Cart".
  - Multi-line items with real-time stock cap validation, unit prices, item discounts, and quantity steppers.
  - Customer selection with inline **Quick Add Customer** modal.
  - Flexible discount (flat amount or %) and GST/Tax calculation (0%, 5%, 12%, 18%, 28%).
  - Payment modes: Cash, UPI / QR Code, Credit/Debit Card, Bank Transfer, Cheque, Credit/Due.
  - Auto-generated sequential invoice numbers (e.g. `INV-YYYYMMDD-0001` or custom business prefix).
  - Automatic inventory decrement and balance calculation.
- **Selling History Ledger**:
  - Searchable and filterable by Date range (Today, 7 Days, 30 Days, All Time), Customer, and Payment Status (PAID, PARTIAL, UNPAID).
  - Record partial balance payments directly against past invoices with payment history receipts.

### 5. 📄 Downloadable & Printable Vector PDF Bills
- **Professional PDF Invoices**:
  - Crisp, high-resolution vector PDF generated client-side via `jspdf` and `jspdf-autotable`.
  - Customizable business branding: Company Name, Owner, Phone, Email, Address, GSTIN.
  - Bill To customer section with phone and address.
  - Clean itemized table with line totals, unit price, and SKU.
  - Detailed financial breakdown: Subtotal, Discount, Tax, Grand Total, Amount Paid, and Balance Due with status badge (PAID, PARTIAL, UNPAID).
  - Terms & conditions and authorized signatory placeholder.
  - 1-Click **"Download PDF"** and **"Print Bill"** buttons.

### 6. 📊 Executive Dashboard & Business Settings
- **KPI Metrics**: Total Revenue Collected, Today's Sales, Pending Receivables, Low Stock Alerts Count, Total Customers, and Total Invoices.
- **Actionable Low Stock Center**: List of critical items with 1-click restock buttons directly on the dashboard.
- **Analytics Charts**: Daily revenue trends and top 5 selling products by quantity.
- **Business Profile Settings**: Configure store branding, GSTIN, currency symbol (₹, $, €, £, AED), invoice number prefix, and default terms.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 (Vite), React Router v6, Axios, Lucide React (Icons), jsPDF, jsPDF-AutoTable |
| **Backend** | Node.js, Express.js, JWT Authentication, bcryptjs, lowdb (JSON database) |
| **SMS** | 1-Click Native SMS URI Protocol + Backend Gateway Engine (Simulator / Fast2SMS / Twilio) |

---

## 🚀 Getting Started

### 1. Start the Backend Server

```bash
cd backend
npm install
npm start
```
The backend will run on `http://localhost:5000`.

### 2. Start the Frontend Development Server

```bash
cd frontend
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`.

### 3. Run Backend Verification Test Suite

```bash
node backend/test_api.js
```
Runs 13 automated test cases covering auth, business profile, customers, stock intake, restock, multi-item POS invoice checkout, automatic stock reduction, payment recording, 1-click SMS, and analytics.

---

## 🔒 Multi-Tenant Data Isolation

Every business registers their own account and receives an isolated `businessId` in their JWT token. All database queries across customers, products, invoices, stock movements, and SMS logs are automatically partitioned by `businessId`.
