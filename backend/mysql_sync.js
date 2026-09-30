const mysql = require('mysql2/promise');
const path = require('path');

const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DB || 'bizmanager_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;
let isConnected = false;

// Initialize connection pool & ensure database and tables exist
async function initMySQL() {
  try {
    // 1. First connect without database to create database if not exists
    const rootConn = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConn.end();

    // 2. Connect to pool with database
    pool = mysql.createPool(dbConfig);
    isConnected = true;

    // 3. Create tables if not exist
    await createTablesIfNotExist();
    console.log('[MYSQL LIVE SYNC] ✅ Connected to MySQL (phpMyAdmin `bizmanager_db`) - Real-time sync enabled!');

    // 4. Perform initial full synchronization
    await syncAllFromLowDB();
  } catch (err) {
    console.warn('[MYSQL LIVE SYNC] ⚠️ MySQL not available or failed to connect:', err.message);
    isConnected = false;
  }
}

async function createTablesIfNotExist() {
  if (!pool) return;
  const queries = [
    `CREATE TABLE IF NOT EXISTS \`businesses\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`businessName\` VARCHAR(255) NOT NULL,
      \`ownerName\` VARCHAR(255),
      \`email\` VARCHAR(255) UNIQUE NOT NULL,
      \`password\` VARCHAR(255) NOT NULL,
      \`mobile\` VARCHAR(32),
      \`address\` TEXT,
      \`gstin\` VARCHAR(64),
      \`currency\` VARCHAR(16) DEFAULT '₹',
      \`upiId\` VARCHAR(128),
      \`thermalPrintWidth\` VARCHAR(16) DEFAULT '80mm',
      \`invoicePrefix\` VARCHAR(32) DEFAULT 'INV',
      \`invoiceNotes\` TEXT,
      \`smsConfig\` JSON,
      \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS \`customers\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`businessId\` VARCHAR(64) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`phone\` VARCHAR(32),
      \`email\` VARCHAR(255),
      \`address\` TEXT,
      \`gstin\` VARCHAR(64),
      \`totalBalance\` DECIMAL(12,2) DEFAULT 0.00,
      \`notes\` TEXT,
      \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY \`idx_cust_biz\` (\`businessId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS \`products\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`businessId\` VARCHAR(64) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`sku\` VARCHAR(64),
      \`category\` VARCHAR(128),
      \`unit\` VARCHAR(32) DEFAULT 'pcs',
      \`costPrice\` DECIMAL(12,2) DEFAULT 0.00,
      \`price\` DECIMAL(12,2) NOT NULL,
      \`quantity\` INT DEFAULT 0,
      \`lowStockThreshold\` INT DEFAULT 5,
      \`batchNo\` VARCHAR(64),
      \`expiryDate\` DATE,
      \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY \`idx_prod_biz\` (\`businessId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS \`invoices\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`businessId\` VARCHAR(64) NOT NULL,
      \`invoiceNumber\` VARCHAR(64) NOT NULL,
      \`customerId\` VARCHAR(64),
      \`customerName\` VARCHAR(255),
      \`customerPhone\` VARCHAR(32),
      \`customerAddress\` TEXT,
      \`customerGstin\` VARCHAR(64),
      \`subtotal\` DECIMAL(12,2) DEFAULT 0.00,
      \`discountTotal\` DECIMAL(12,2) DEFAULT 0.00,
      \`taxRate\` DECIMAL(5,2) DEFAULT 0.00,
      \`taxTotal\` DECIMAL(12,2) DEFAULT 0.00,
      \`taxMode\` VARCHAR(32) DEFAULT 'inclusive',
      \`grandTotal\` DECIMAL(12,2) NOT NULL,
      \`amountPaid\` DECIMAL(12,2) DEFAULT 0.00,
      \`balance\` DECIMAL(12,2) DEFAULT 0.00,
      \`paymentMethod\` VARCHAR(64) DEFAULT 'Cash',
      \`cashAmount\` DECIMAL(12,2) DEFAULT 0.00,
      \`upiAmount\` DECIMAL(12,2) DEFAULT 0.00,
      \`cardAmount\` DECIMAL(12,2) DEFAULT 0.00,
      \`status\` VARCHAR(32) DEFAULT 'PAID',
      \`notes\` TEXT,
      \`date\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      \`dueDate\` DATETIME,
      \`paymentHistory\` JSON,
      KEY \`idx_inv_biz\` (\`businessId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS \`invoice_items\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`invoiceId\` VARCHAR(64) NOT NULL,
      \`productId\` VARCHAR(64),
      \`productName\` VARCHAR(255),
      \`sku\` VARCHAR(64),
      \`quantity\` INT NOT NULL DEFAULT 1,
      \`unitPrice\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      \`discount\` DECIMAL(12,2) DEFAULT 0.00,
      \`taxRate\` DECIMAL(5,2) DEFAULT 0.00,
      \`total\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      KEY \`idx_item_inv\` (\`invoiceId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS \`suppliers\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`businessId\` VARCHAR(64) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`phone\` VARCHAR(32),
      \`email\` VARCHAR(255),
      \`address\` TEXT,
      \`gstin\` VARCHAR(64),
      \`totalPurchased\` DECIMAL(12,2) DEFAULT 0.00,
      \`balancePayable\` DECIMAL(12,2) DEFAULT 0.00,
      \`notes\` TEXT,
      \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY \`idx_sup_biz\` (\`businessId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS \`purchase_orders\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`businessId\` VARCHAR(64) NOT NULL,
      \`purchaseNumber\` VARCHAR(64) NOT NULL,
      \`supplierId\` VARCHAR(64),
      \`supplierName\` VARCHAR(255),
      \`date\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      \`subtotal\` DECIMAL(12,2) DEFAULT 0.00,
      \`taxTotal\` DECIMAL(12,2) DEFAULT 0.00,
      \`totalAmount\` DECIMAL(12,2) NOT NULL,
      \`amountPaid\` DECIMAL(12,2) DEFAULT 0.00,
      \`balanceDue\` DECIMAL(12,2) DEFAULT 0.00,
      \`paymentMode\` VARCHAR(64) DEFAULT 'CASH',
      \`notes\` TEXT,
      \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY \`idx_po_biz\` (\`businessId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS \`purchase_items\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`purchaseId\` VARCHAR(64) NOT NULL,
      \`productId\` VARCHAR(64),
      \`productName\` VARCHAR(255),
      \`sku\` VARCHAR(64),
      \`qty\` INT NOT NULL DEFAULT 1,
      \`unitCost\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      \`lineTotal\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      KEY \`idx_pitem_p\` (\`purchaseId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS \`expenses\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`businessId\` VARCHAR(64) NOT NULL,
      \`title\` VARCHAR(255) NOT NULL,
      \`category\` VARCHAR(128) NOT NULL,
      \`amount\` DECIMAL(12,2) NOT NULL,
      \`paymentMode\` VARCHAR(64) DEFAULT 'CASH',
      \`date\` DATE NOT NULL,
      \`receiptNo\` VARCHAR(64),
      \`notes\` TEXT,
      \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY \`idx_exp_biz\` (\`businessId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS \`stock_logs\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`businessId\` VARCHAR(64) NOT NULL,
      \`productId\` VARCHAR(64) NOT NULL,
      \`productName\` VARCHAR(255),
      \`type\` VARCHAR(64) NOT NULL,
      \`quantity\` INT NOT NULL,
      \`previousQuantity\` INT NOT NULL,
      \`newQuantity\` INT NOT NULL,
      \`reason\` TEXT,
      \`date\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY \`idx_slog_prod\` (\`productId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS \`sms_logs\` (
      \`id\` VARCHAR(64) PRIMARY KEY,
      \`businessId\` VARCHAR(64) NOT NULL,
      \`customerId\` VARCHAR(64),
      \`customerName\` VARCHAR(255),
      \`phone\` VARCHAR(32),
      \`message\` TEXT,
      \`templateType\` VARCHAR(64),
      \`status\` VARCHAR(32),
      \`gateway\` VARCHAR(64),
      \`date\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY \`idx_sms_biz\` (\`businessId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  ];

  for (const q of queries) {
    await pool.query(q);
  }
}

// ---------------- Helper Sync Functions ---------------- //

async function syncBusiness(b) {
  if (!pool || !b) return;
  try {
    const sql = `INSERT INTO \`businesses\` (id, businessName, ownerName, email, password, mobile, address, gstin, currency, upiId, thermalPrintWidth, invoicePrefix, invoiceNotes, smsConfig, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      businessName=VALUES(businessName), ownerName=VALUES(ownerName), mobile=VALUES(mobile), address=VALUES(address), gstin=VALUES(gstin), currency=VALUES(currency), upiId=VALUES(upiId), thermalPrintWidth=VALUES(thermalPrintWidth), invoicePrefix=VALUES(invoicePrefix), invoiceNotes=VALUES(invoiceNotes), smsConfig=VALUES(smsConfig);`;
    
    await pool.query(sql, [
      b.id, b.businessName, b.ownerName || null, b.email, b.password, b.mobile || null,
      b.address || null, b.gstin || null, b.currency || '₹', b.upiId || null,
      b.thermalPrintWidth || '80mm', b.invoicePrefix || 'INV', b.invoiceNotes || null,
      b.smsConfig ? JSON.stringify(b.smsConfig) : null, b.createdAt ? new Date(b.createdAt) : new Date()
    ]);
  } catch (err) {
    console.error('[MYSQL SYNC] Error syncing business:', err.message);
  }
}

async function syncCustomer(c) {
  if (!pool || !c) return;
  try {
    const sql = `INSERT INTO \`customers\` (id, businessId, name, phone, email, address, gstin, totalBalance, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      name=VALUES(name), phone=VALUES(phone), email=VALUES(email), address=VALUES(address), gstin=VALUES(gstin), totalBalance=VALUES(totalBalance), notes=VALUES(notes);`;
    
    await pool.query(sql, [
      c.id, c.businessId, c.name, c.phone || null, c.email || null, c.address || null,
      c.gstin || null, c.totalBalance || 0, c.notes || null, c.createdAt ? new Date(c.createdAt) : new Date()
    ]);
  } catch (err) {
    console.error('[MYSQL SYNC] Error syncing customer:', err.message);
  }
}

async function syncProduct(p) {
  if (!pool || !p) return;
  try {
    const sql = `INSERT INTO \`products\` (id, businessId, name, sku, category, unit, costPrice, price, quantity, lowStockThreshold, batchNo, expiryDate, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      name=VALUES(name), sku=VALUES(sku), category=VALUES(category), unit=VALUES(unit), costPrice=VALUES(costPrice), price=VALUES(price), quantity=VALUES(quantity), lowStockThreshold=VALUES(lowStockThreshold), batchNo=VALUES(batchNo), expiryDate=VALUES(expiryDate);`;
    
    await pool.query(sql, [
      p.id, p.businessId, p.name, p.sku || null, p.category || null, p.unit || 'pcs',
      p.costPrice || 0, p.price || 0, p.quantity || 0, p.lowStockThreshold || 5,
      p.batchNo || null, p.expiryDate || null, p.createdAt ? new Date(p.createdAt) : new Date()
    ]);
  } catch (err) {
    console.error('[MYSQL SYNC] Error syncing product:', err.message);
  }
}

async function syncSupplier(s) {
  if (!pool || !s) return;
  try {
    const sql = `INSERT INTO \`suppliers\` (id, businessId, name, phone, email, address, gstin, totalPurchased, balancePayable, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      name=VALUES(name), phone=VALUES(phone), email=VALUES(email), address=VALUES(address), gstin=VALUES(gstin), totalPurchased=VALUES(totalPurchased), balancePayable=VALUES(balancePayable), notes=VALUES(notes);`;
    
    await pool.query(sql, [
      s.id, s.businessId, s.name, s.phone || null, s.email || null, s.address || null,
      s.gstin || null, s.totalPurchased || 0, s.balancePayable || 0, s.notes || null, s.createdAt ? new Date(s.createdAt) : new Date()
    ]);
  } catch (err) {
    console.error('[MYSQL SYNC] Error syncing supplier:', err.message);
  }
}

async function syncExpense(e) {
  if (!pool || !e) return;
  try {
    const sql = `INSERT INTO \`expenses\` (id, businessId, title, category, amount, paymentMode, date, receiptNo, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      title=VALUES(title), category=VALUES(category), amount=VALUES(amount), paymentMode=VALUES(paymentMode), date=VALUES(date), receiptNo=VALUES(receiptNo), notes=VALUES(notes);`;
    
    await pool.query(sql, [
      e.id, e.businessId, e.title, e.category, e.amount, e.paymentMode || 'CASH',
      e.date, e.receiptNo || null, e.notes || null, e.createdAt ? new Date(e.createdAt) : new Date()
    ]);
  } catch (err) {
    console.error('[MYSQL SYNC] Error syncing expense:', err.message);
  }
}

async function syncPurchase(po) {
  if (!pool || !po) return;
  try {
    const sql = `INSERT INTO \`purchase_orders\` (id, businessId, purchaseNumber, supplierId, supplierName, date, subtotal, taxTotal, totalAmount, amountPaid, balanceDue, paymentMode, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      subtotal=VALUES(subtotal), taxTotal=VALUES(taxTotal), totalAmount=VALUES(totalAmount), amountPaid=VALUES(amountPaid), balanceDue=VALUES(balanceDue), paymentMode=VALUES(paymentMode), notes=VALUES(notes);`;
    
    const purchaseNum = po.purchaseNumber || po.poNumber || `PO-${po.id.slice(0, 8)}`;
    const totAmount = po.totalAmount !== undefined ? po.totalAmount : (po.grandTotal || 0);
    const balDue = po.balanceDue !== undefined ? po.balanceDue : (po.balance || 0);

    await pool.query(sql, [
      po.id, po.businessId, purchaseNum, po.supplierId || null, po.supplierName || null,
      po.date ? new Date(po.date) : new Date(), po.subtotal || 0, po.taxTotal || 0,
      totAmount, po.amountPaid || 0, balDue, po.paymentMode || 'CASH',
      po.notes || null, po.createdAt ? new Date(po.createdAt) : new Date()
    ]);

    // Sync items
    if (po.items && Array.isArray(po.items)) {
      await pool.query('DELETE FROM `purchase_items` WHERE purchaseId = ?', [po.id]);
      for (const item of po.items) {
        await pool.query(
          'INSERT INTO `purchase_items` (purchaseId, productId, productName, sku, qty, unitCost, lineTotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [po.id, item.productId || null, item.productName || null, item.sku || null, item.qty || 1, item.unitCost || 0, item.lineTotal || 0]
        );
      }
    }
  } catch (err) {
    console.error('[MYSQL SYNC] Error syncing purchase order:', err.message);
  }
}

async function syncInvoice(inv) {
  if (!pool || !inv) return;
  try {
    const sql = `INSERT INTO \`invoices\` (id, businessId, invoiceNumber, customerId, customerName, customerPhone, customerAddress, customerGstin, subtotal, discountTotal, taxRate, taxTotal, taxMode, grandTotal, amountPaid, balance, paymentMethod, cashAmount, upiAmount, cardAmount, status, notes, date, dueDate, paymentHistory)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      subtotal=VALUES(subtotal), discountTotal=VALUES(discountTotal), taxRate=VALUES(taxRate), taxTotal=VALUES(taxTotal), taxMode=VALUES(taxMode), grandTotal=VALUES(grandTotal), amountPaid=VALUES(amountPaid), balance=VALUES(balance), paymentMethod=VALUES(paymentMethod), cashAmount=VALUES(cashAmount), upiAmount=VALUES(upiAmount), cardAmount=VALUES(cardAmount), status=VALUES(status), notes=VALUES(notes), paymentHistory=VALUES(paymentHistory);`;
    
    await pool.query(sql, [
      inv.id, inv.businessId, inv.invoiceNumber, inv.customerId || null, inv.customerName || null,
      inv.customerPhone || null, inv.customerAddress || null, inv.customerGstin || null,
      inv.subtotal || 0, inv.discountTotal || 0, inv.taxRate || 0, inv.taxTotal || 0,
      inv.taxMode || 'inclusive', inv.grandTotal, inv.amountPaid || 0, inv.balance || 0,
      inv.paymentMethod || 'Cash', inv.cashAmount || 0, inv.upiAmount || 0, inv.cardAmount || 0,
      inv.status || 'PAID', inv.notes || null, inv.date ? new Date(inv.date) : new Date(),
      inv.dueDate ? new Date(inv.dueDate) : null, inv.paymentHistory ? JSON.stringify(inv.paymentHistory) : null
    ]);

    // Sync items
    if (inv.items && Array.isArray(inv.items)) {
      await pool.query('DELETE FROM `invoice_items` WHERE invoiceId = ?', [inv.id]);
      for (const item of inv.items) {
        await pool.query(
          'INSERT INTO `invoice_items` (invoiceId, productId, productName, sku, quantity, unitPrice, discount, taxRate, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [inv.id, item.productId || null, item.productName || null, item.sku || null, item.quantity || 1, item.unitPrice || 0, item.discount || 0, item.taxRate || 0, item.total || 0]
        );
      }
    }
  } catch (err) {
    console.error('[MYSQL SYNC] Error syncing invoice:', err.message);
  }
}

async function syncStockLog(s) {
  if (!pool || !s) return;
  try {
    const sql = `INSERT INTO \`stock_logs\` (id, businessId, productId, productName, type, quantity, previousQuantity, newQuantity, reason, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      quantity=VALUES(quantity), previousQuantity=VALUES(previousQuantity), newQuantity=VALUES(newQuantity), reason=VALUES(reason);`;
    
    await pool.query(sql, [
      s.id, s.businessId, s.productId, s.productName || null, s.type, s.quantity,
      s.previousQuantity, s.newQuantity, s.reason || null, s.date ? new Date(s.date) : new Date()
    ]);
  } catch (err) {
    console.error('[MYSQL SYNC] Error syncing stock log:', err.message);
  }
}

async function syncSMSLog(s) {
  if (!pool || !s) return;
  try {
    const sql = `INSERT INTO \`sms_logs\` (id, businessId, customerId, customerName, phone, message, templateType, status, gateway, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      status=VALUES(status);`;
    
    await pool.query(sql, [
      s.id, s.businessId, s.customerId || null, s.customerName || null, s.phone || null,
      s.message || null, s.templateType || null, s.status || null, s.gateway || null,
      s.date ? new Date(s.date) : new Date()
    ]);
  } catch (err) {
    console.error('[MYSQL SYNC] Error syncing SMS log:', err.message);
  }
}

async function deleteFromMySQL(tableName, id) {
  if (!pool || !tableName || !id) return;
  try {
    await pool.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [id]);
    if (tableName === 'invoices') {
      await pool.query('DELETE FROM `invoice_items` WHERE invoiceId = ?', [id]);
    } else if (tableName === 'purchase_orders') {
      await pool.query('DELETE FROM `purchase_items` WHERE purchaseId = ?', [id]);
    }
  } catch (err) {
    console.error(`[MYSQL SYNC] Error deleting from ${tableName}:`, err.message);
  }
}

// Bulk Sync from db.json
async function syncAllFromLowDB() {
  if (!pool) return;
  try {
    const db = require('./db');
    const data = db.getState();

    for (const b of (data.businesses || [])) await syncBusiness(b);
    for (const c of (data.customers || [])) await syncCustomer(c);
    for (const p of (data.products || [])) await syncProduct(p);
    for (const s of (data.suppliers || [])) await syncSupplier(s);
    for (const po of (data.purchases || [])) await syncPurchase(po);
    for (const exp of (data.expenses || [])) await syncExpense(exp);
    for (const inv of (data.invoices || [])) await syncInvoice(inv);
    for (const slog of (data.stockLogs || [])) await syncStockLog(slog);
    for (const sms of (data.smsLogs || [])) await syncSMSLog(sms);

    console.log('[MYSQL LIVE SYNC] 🚀 All tables and records synchronized to phpMyAdmin (`bizmanager_db`) successfully!');
  } catch (err) {
    console.error('[MYSQL LIVE SYNC] Initial sync error:', err.message);
  }
}

module.exports = {
  initMySQL,
  syncBusiness,
  syncCustomer,
  syncProduct,
  syncSupplier,
  syncExpense,
  syncPurchase,
  syncInvoice,
  syncStockLog,
  syncSMSLog,
  deleteFromMySQL,
  syncAllFromLowDB
};
