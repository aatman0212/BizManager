const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');
const outputPath = path.join(__dirname, '..', 'bizmanager_database.sql');

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
  return `'${String(val).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
}

function generateSqlDump() {
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  let sql = `-- =============================================================\n`;
  sql += `-- BizManager Database Dump for MySQL Workbench & phpMyAdmin\n`;
  sql += `-- Generated on: ${new Date().toISOString()}\n`;
  sql += `-- =============================================================\n\n`;

  sql += `CREATE DATABASE IF NOT EXISTS \`bizmanager_db\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`;
  sql += `USE \`bizmanager_db\`;\n\n`;

  sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  // 1. businesses table
  sql += `-- -------------------------------------------------------------\n`;
  sql += `-- Table structure for businesses\n`;
  sql += `-- -------------------------------------------------------------\n`;
  sql += `DROP TABLE IF EXISTS \`businesses\`;\n`;
  sql += `CREATE TABLE \`businesses\` (\n`;
  sql += `  \`id\` VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  \`businessName\` VARCHAR(255) NOT NULL,\n`;
  sql += `  \`ownerName\` VARCHAR(255),\n`;
  sql += `  \`email\` VARCHAR(255) UNIQUE NOT NULL,\n`;
  sql += `  \`password\` VARCHAR(255) NOT NULL,\n`;
  sql += `  \`mobile\` VARCHAR(32),\n`;
  sql += `  \`address\` TEXT,\n`;
  sql += `  \`gstin\` VARCHAR(64),\n`;
  sql += `  \`currency\` VARCHAR(16) DEFAULT '₹',\n`;
  sql += `  \`upiId\` VARCHAR(128),\n`;
  sql += `  \`thermalPrintWidth\` VARCHAR(16) DEFAULT '80mm',\n`;
  sql += `  \`invoicePrefix\` VARCHAR(32) DEFAULT 'INV',\n`;
  sql += `  \`invoiceNotes\` TEXT,\n`;
  sql += `  \`smsConfig\` JSON,\n`;
  sql += `  \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  if (dbData.businesses && dbData.businesses.length > 0) {
    sql += `INSERT INTO \`businesses\` VALUES \n`;
    const rows = dbData.businesses.map(b => 
      `(${escapeSql(b.id)}, ${escapeSql(b.businessName)}, ${escapeSql(b.ownerName)}, ${escapeSql(b.email)}, ${escapeSql(b.password)}, ${escapeSql(b.mobile)}, ${escapeSql(b.address)}, ${escapeSql(b.gstin)}, ${escapeSql(b.currency)}, ${escapeSql(b.upiId)}, ${escapeSql(b.thermalPrintWidth)}, ${escapeSql(b.invoicePrefix)}, ${escapeSql(b.invoiceNotes)}, ${escapeSql(b.smsConfig || null)}, ${escapeSql(b.createdAt)})`
    );
    sql += rows.join(',\n') + ';\n\n';
  }

  // 2. customers table
  sql += `-- -------------------------------------------------------------\n`;
  sql += `-- Table structure for customers\n`;
  sql += `-- -------------------------------------------------------------\n`;
  sql += `DROP TABLE IF EXISTS \`customers\`;\n`;
  sql += `CREATE TABLE \`customers\` (\n`;
  sql += `  \`id\` VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  \`businessId\` VARCHAR(64) NOT NULL,\n`;
  sql += `  \`name\` VARCHAR(255) NOT NULL,\n`;
  sql += `  \`phone\` VARCHAR(32),\n`;
  sql += `  \`email\` VARCHAR(255),\n`;
  sql += `  \`address\` TEXT,\n`;
  sql += `  \`gstin\` VARCHAR(64),\n`;
  sql += `  \`totalBalance\` DECIMAL(12,2) DEFAULT 0.00,\n`;
  sql += `  \`notes\` TEXT,\n`;
  sql += `  \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,\n`;
  sql += `  KEY \`idx_cust_businessId\` (\`businessId\`)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  if (dbData.customers && dbData.customers.length > 0) {
    sql += `INSERT INTO \`customers\` VALUES \n`;
    const rows = dbData.customers.map(c => 
      `(${escapeSql(c.id)}, ${escapeSql(c.businessId)}, ${escapeSql(c.name)}, ${escapeSql(c.phone)}, ${escapeSql(c.email)}, ${escapeSql(c.address)}, ${escapeSql(c.gstin)}, ${escapeSql(c.totalBalance || 0)}, ${escapeSql(c.notes)}, ${escapeSql(c.createdAt)})`
    );
    sql += rows.join(',\n') + ';\n\n';
  }

  // 3. products table
  sql += `-- -------------------------------------------------------------\n`;
  sql += `-- Table structure for products\n`;
  sql += `-- -------------------------------------------------------------\n`;
  sql += `DROP TABLE IF EXISTS \`products\`;\n`;
  sql += `CREATE TABLE \`products\` (\n`;
  sql += `  \`id\` VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  \`businessId\` VARCHAR(64) NOT NULL,\n`;
  sql += `  \`name\` VARCHAR(255) NOT NULL,\n`;
  sql += `  \`sku\` VARCHAR(64),\n`;
  sql += `  \`category\` VARCHAR(128),\n`;
  sql += `  \`unit\` VARCHAR(32) DEFAULT 'pcs',\n`;
  sql += `  \`costPrice\` DECIMAL(12,2) DEFAULT 0.00,\n`;
  sql += `  \`price\` DECIMAL(12,2) NOT NULL,\n`;
  sql += `  \`quantity\` INT DEFAULT 0,\n`;
  sql += `  \`lowStockThreshold\` INT DEFAULT 5,\n`;
  sql += `  \`batchNo\` VARCHAR(64),\n`;
  sql += `  \`expiryDate\` DATE,\n`;
  sql += `  \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,\n`;
  sql += `  KEY \`idx_prod_businessId\` (\`businessId\`)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  if (dbData.products && dbData.products.length > 0) {
    sql += `INSERT INTO \`products\` VALUES \n`;
    const rows = dbData.products.map(p => 
      `(${escapeSql(p.id)}, ${escapeSql(p.businessId)}, ${escapeSql(p.name)}, ${escapeSql(p.sku)}, ${escapeSql(p.category)}, ${escapeSql(p.unit)}, ${escapeSql(p.costPrice || 0)}, ${escapeSql(p.price || 0)}, ${escapeSql(p.quantity || 0)}, ${escapeSql(p.lowStockThreshold || 5)}, ${escapeSql(p.batchNo)}, ${escapeSql(p.expiryDate)}, ${escapeSql(p.createdAt)})`
    );
    sql += rows.join(',\n') + ';\n\n';
  }

  // 4. invoices table
  sql += `-- -------------------------------------------------------------\n`;
  sql += `-- Table structure for invoices\n`;
  sql += `-- -------------------------------------------------------------\n`;
  sql += `DROP TABLE IF EXISTS \`invoices\`;\n`;
  sql += `CREATE TABLE \`invoices\` (\n`;
  sql += `  \`id\` VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  \`businessId\` VARCHAR(64) NOT NULL,\n`;
  sql += `  \`invoiceNumber\` VARCHAR(64) NOT NULL,\n`;
  sql += `  \`customerId\` VARCHAR(64),\n`;
  sql += `  \`customerName\` VARCHAR(255),\n`;
  sql += `  \`customerPhone\` VARCHAR(32),\n`;
  sql += `  \`customerAddress\` TEXT,\n`;
  sql += `  \`customerGstin\` VARCHAR(64),\n`;
  sql += `  \`subtotal\` DECIMAL(12,2) DEFAULT 0.00,\n`;
  sql += `  \`discountTotal\` DECIMAL(12,2) DEFAULT 0.00,\n`;
  sql += `  \`taxRate\` DECIMAL(5,2) DEFAULT 0.00,\n`;
  sql += `  \`taxTotal\` DECIMAL(12,2) DEFAULT 0.00,\n`;
  sql += `  \`taxMode\` VARCHAR(32) DEFAULT 'inclusive',\n`;
  sql += `  \`grandTotal\` DECIMAL(12,2) NOT NULL,\n`;
  sql += `  \`amountPaid\` DECIMAL(12,2) DEFAULT 0.00,\n`;
  sql += `  \`balance\` DECIMAL(12,2) DEFAULT 0.00,\n`;
  sql += `  \`paymentMethod\` VARCHAR(64) DEFAULT 'Cash',\n`;
  sql += `  \`cashAmount\` DECIMAL(12,2) DEFAULT 0.00,\n`;
  sql += `  \`upiAmount\` DECIMAL(12,2) DEFAULT 0.00,\n`;
  sql += `  \`cardAmount\` DECIMAL(12,2) DEFAULT 0.00,\n`;
  sql += `  \`status\` VARCHAR(32) DEFAULT 'PAID',\n`;
  sql += `  \`notes\` TEXT,\n`;
  sql += `  \`date\` DATETIME DEFAULT CURRENT_TIMESTAMP,\n`;
  sql += `  \`dueDate\` DATETIME,\n`;
  sql += `  \`paymentHistory\` JSON,\n`;
  sql += `  KEY \`idx_inv_businessId\` (\`businessId\`)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  // 5. invoice_items table (Normalized relational breakdown)
  sql += `-- -------------------------------------------------------------\n`;
  sql += `-- Table structure for invoice_items\n`;
  sql += `-- -------------------------------------------------------------\n`;
  sql += `DROP TABLE IF EXISTS \`invoice_items\`;\n`;
  sql += `CREATE TABLE \`invoice_items\` (\n`;
  sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
  sql += `  \`invoiceId\` VARCHAR(64) NOT NULL,\n`;
  sql += `  \`productId\` VARCHAR(64),\n`;
  sql += `  \`productName\` VARCHAR(255),\n`;
  sql += `  \`sku\` VARCHAR(64),\n`;
  sql += `  \`quantity\` INT NOT NULL DEFAULT 1,\n`;
  sql += `  \`unitPrice\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
  sql += `  \`discount\` DECIMAL(12,2) DEFAULT 0.00,\n`;
  sql += `  \`taxRate\` DECIMAL(5,2) DEFAULT 0.00,\n`;
  sql += `  \`total\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
  sql += `  KEY \`idx_item_invoiceId\` (\`invoiceId\`)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  if (dbData.invoices && dbData.invoices.length > 0) {
    sql += `INSERT INTO \`invoices\` VALUES \n`;
    const rows = dbData.invoices.map(i => 
      `(${escapeSql(i.id)}, ${escapeSql(i.businessId)}, ${escapeSql(i.invoiceNumber)}, ${escapeSql(i.customerId)}, ${escapeSql(i.customerName)}, ${escapeSql(i.customerPhone)}, ${escapeSql(i.customerAddress)}, ${escapeSql(i.customerGstin)}, ${escapeSql(i.subtotal)}, ${escapeSql(i.discountTotal || 0)}, ${escapeSql(i.taxRate || 0)}, ${escapeSql(i.taxTotal || 0)}, ${escapeSql(i.taxMode || 'inclusive')}, ${escapeSql(i.grandTotal)}, ${escapeSql(i.amountPaid || 0)}, ${escapeSql(i.balance || 0)}, ${escapeSql(i.paymentMethod || 'Cash')}, ${escapeSql(i.cashAmount || 0)}, ${escapeSql(i.upiAmount || 0)}, ${escapeSql(i.cardAmount || 0)}, ${escapeSql(i.status || 'PAID')}, ${escapeSql(i.notes)}, ${escapeSql(i.date)}, ${escapeSql(i.dueDate)}, ${escapeSql(i.paymentHistory || [])})`
    );
    sql += rows.join(',\n') + ';\n\n';

    // Populate invoice_items
    const allItems = [];
    dbData.invoices.forEach(inv => {
      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach(it => {
          allItems.push(`(NULL, ${escapeSql(inv.id)}, ${escapeSql(it.productId)}, ${escapeSql(it.productName)}, ${escapeSql(it.sku)}, ${escapeSql(it.quantity || 1)}, ${escapeSql(it.unitPrice || 0)}, ${escapeSql(it.discount || 0)}, ${escapeSql(it.taxRate || 0)}, ${escapeSql(it.total || 0)})`);
        });
      }
    });

    if (allItems.length > 0) {
      sql += `INSERT INTO \`invoice_items\` VALUES \n` + allItems.join(',\n') + ';\n\n';
    }
  }

  // 6. suppliers table
  sql += `-- -------------------------------------------------------------\n`;
  sql += `-- Table structure for suppliers\n`;
  sql += `-- -------------------------------------------------------------\n`;
  sql += `DROP TABLE IF EXISTS \`suppliers\`;\n`;
  sql += `CREATE TABLE \`suppliers\` (\n`;
  sql += `  \`id\` VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  \`businessId\` VARCHAR(64) NOT NULL,\n`;
  sql += `  \`name\` VARCHAR(255) NOT NULL,\n`;
  sql += `  \`phone\` VARCHAR(32),\n`;
  sql += `  \`email\` VARCHAR(255),\n`;
  sql += `  \`address\` TEXT,\n`;
  sql += `  \`gstin\` VARCHAR(64),\n`;
  sql += `  \`totalPurchased\` DECIMAL(12,2) DEFAULT 0.00,\n`;
  sql += `  \`balancePayable\` DECIMAL(12,2) DEFAULT 0.00,\n`;
  sql += `  \`notes\` TEXT,\n`;
  sql += `  \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,\n`;
  sql += `  KEY \`idx_sup_businessId\` (\`businessId\`)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  if (dbData.suppliers && dbData.suppliers.length > 0) {
    sql += `INSERT INTO \`suppliers\` VALUES \n`;
    const rows = dbData.suppliers.map(s => 
      `(${escapeSql(s.id)}, ${escapeSql(s.businessId)}, ${escapeSql(s.name)}, ${escapeSql(s.phone)}, ${escapeSql(s.email)}, ${escapeSql(s.address)}, ${escapeSql(s.gstin)}, ${escapeSql(s.totalPurchased || 0)}, ${escapeSql(s.balancePayable || 0)}, ${escapeSql(s.notes)}, ${escapeSql(s.createdAt)})`
    );
    sql += rows.join(',\n') + ';\n\n';
  }

  // 7. purchase_orders table
  sql += `-- -------------------------------------------------------------\n`;
  sql += `-- Table structure for purchase_orders\n`;
  sql += `-- -------------------------------------------------------------\n`;
  sql += `DROP TABLE IF EXISTS \`purchase_orders\`;\n`;
  sql += `CREATE TABLE \`purchase_orders\` (\n`;
  sql += `  \`id\` VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  \`businessId\` VARCHAR(64) NOT NULL,\n`;
  sql += `  \`purchaseNumber\` VARCHAR(64) NOT NULL,\n`;
  sql += `  \`supplierId\` VARCHAR(64),\n`;
  sql += `  \`supplierName\` VARCHAR(255),\n`;
  sql += `  \`date\` DATETIME DEFAULT CURRENT_TIMESTAMP,\n`;
  sql += `  \`subtotal\` DECIMAL(12,2) DEFAULT 0.00,\n`;
  sql += `  \`taxTotal\` DECIMAL(12,2) DEFAULT 0.00,\n`;
  sql += `  \`totalAmount\` DECIMAL(12,2) NOT NULL,\n`;
  sql += `  \`amountPaid\` DECIMAL(12,2) DEFAULT 0.00,\n`;
  sql += `  \`balanceDue\` DECIMAL(12,2) DEFAULT 0.00,\n`;
  sql += `  \`paymentMode\` VARCHAR(64) DEFAULT 'CASH',\n`;
  sql += `  \`notes\` TEXT,\n`;
  sql += `  \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,\n`;
  sql += `  KEY \`idx_po_businessId\` (\`businessId\`)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  // 8. purchase_items table
  sql += `-- -------------------------------------------------------------\n`;
  sql += `-- Table structure for purchase_items\n`;
  sql += `-- -------------------------------------------------------------\n`;
  sql += `DROP TABLE IF EXISTS \`purchase_items\`;\n`;
  sql += `CREATE TABLE \`purchase_items\` (\n`;
  sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
  sql += `  \`purchaseId\` VARCHAR(64) NOT NULL,\n`;
  sql += `  \`productId\` VARCHAR(64),\n`;
  sql += `  \`productName\` VARCHAR(255),\n`;
  sql += `  \`sku\` VARCHAR(64),\n`;
  sql += `  \`qty\` INT NOT NULL DEFAULT 1,\n`;
  sql += `  \`unitCost\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
  sql += `  \`lineTotal\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
  sql += `  KEY \`idx_pitem_purchaseId\` (\`purchaseId\`)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  if (dbData.purchases && dbData.purchases.length > 0) {
    sql += `INSERT INTO \`purchase_orders\` VALUES \n`;
    const rows = dbData.purchases.map(p => 
      `(${escapeSql(p.id)}, ${escapeSql(p.businessId)}, ${escapeSql(p.purchaseNumber)}, ${escapeSql(p.supplierId)}, ${escapeSql(p.supplierName)}, ${escapeSql(p.date)}, ${escapeSql(p.subtotal || 0)}, ${escapeSql(p.taxTotal || 0)}, ${escapeSql(p.totalAmount)}, ${escapeSql(p.amountPaid || 0)}, ${escapeSql(p.balanceDue || 0)}, ${escapeSql(p.paymentMode || 'CASH')}, ${escapeSql(p.notes)}, ${escapeSql(p.createdAt)})`
    );
    sql += rows.join(',\n') + ';\n\n';

    const allPItems = [];
    dbData.purchases.forEach(po => {
      if (po.items && Array.isArray(po.items)) {
        po.items.forEach(it => {
          allPItems.push(`(NULL, ${escapeSql(po.id)}, ${escapeSql(it.productId)}, ${escapeSql(it.productName)}, ${escapeSql(it.sku)}, ${escapeSql(it.qty || 1)}, ${escapeSql(it.unitCost || 0)}, ${escapeSql(it.lineTotal || 0)})`);
        });
      }
    });

    if (allPItems.length > 0) {
      sql += `INSERT INTO \`purchase_items\` VALUES \n` + allPItems.join(',\n') + ';\n\n';
    }
  }

  // 9. expenses table
  sql += `-- -------------------------------------------------------------\n`;
  sql += `-- Table structure for expenses\n`;
  sql += `-- -------------------------------------------------------------\n`;
  sql += `DROP TABLE IF EXISTS \`expenses\`;\n`;
  sql += `CREATE TABLE \`expenses\` (\n`;
  sql += `  \`id\` VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  \`businessId\` VARCHAR(64) NOT NULL,\n`;
  sql += `  \`title\` VARCHAR(255) NOT NULL,\n`;
  sql += `  \`category\` VARCHAR(128) NOT NULL,\n`;
  sql += `  \`amount\` DECIMAL(12,2) NOT NULL,\n`;
  sql += `  \`paymentMode\` VARCHAR(64) DEFAULT 'CASH',\n`;
  sql += `  \`date\` DATE NOT NULL,\n`;
  sql += `  \`receiptNo\` VARCHAR(64),\n`;
  sql += `  \`notes\` TEXT,\n`;
  sql += `  \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,\n`;
  sql += `  KEY \`idx_exp_businessId\` (\`businessId\`)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  if (dbData.expenses && dbData.expenses.length > 0) {
    sql += `INSERT INTO \`expenses\` VALUES \n`;
    const rows = dbData.expenses.map(e => 
      `(${escapeSql(e.id)}, ${escapeSql(e.businessId)}, ${escapeSql(e.title)}, ${escapeSql(e.category)}, ${escapeSql(e.amount)}, ${escapeSql(e.paymentMode || 'CASH')}, ${escapeSql(e.date)}, ${escapeSql(e.receiptNo)}, ${escapeSql(e.notes)}, ${escapeSql(e.createdAt)})`
    );
    sql += rows.join(',\n') + ';\n\n';
  }

  // 10. stock_logs table
  sql += `-- -------------------------------------------------------------\n`;
  sql += `-- Table structure for stock_logs\n`;
  sql += `-- -------------------------------------------------------------\n`;
  sql += `DROP TABLE IF EXISTS \`stock_logs\`;\n`;
  sql += `CREATE TABLE \`stock_logs\` (\n`;
  sql += `  \`id\` VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  \`businessId\` VARCHAR(64) NOT NULL,\n`;
  sql += `  \`productId\` VARCHAR(64) NOT NULL,\n`;
  sql += `  \`productName\` VARCHAR(255),\n`;
  sql += `  \`type\` VARCHAR(64) NOT NULL,\n`;
  sql += `  \`quantity\` INT NOT NULL,\n`;
  sql += `  \`previousQuantity\` INT NOT NULL,\n`;
  sql += `  \`newQuantity\` INT NOT NULL,\n`;
  sql += `  \`reason\` TEXT,\n`;
  sql += `  \`date\` DATETIME DEFAULT CURRENT_TIMESTAMP,\n`;
  sql += `  KEY \`idx_stock_prod\` (\`productId\`) \n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  if (dbData.stockLogs && dbData.stockLogs.length > 0) {
    sql += `INSERT INTO \`stock_logs\` VALUES \n`;
    const rows = dbData.stockLogs.map(s => 
      `(${escapeSql(s.id)}, ${escapeSql(s.businessId)}, ${escapeSql(s.productId)}, ${escapeSql(s.productName)}, ${escapeSql(s.type)}, ${escapeSql(s.quantity)}, ${escapeSql(s.previousQuantity)}, ${escapeSql(s.newQuantity)}, ${escapeSql(s.reason)}, ${escapeSql(s.date)})`
    );
    sql += rows.join(',\n') + ';\n\n';
  }

  // 11. sms_logs table
  sql += `-- -------------------------------------------------------------\n`;
  sql += `-- Table structure for sms_logs\n`;
  sql += `-- -------------------------------------------------------------\n`;
  sql += `DROP TABLE IF EXISTS \`sms_logs\`;\n`;
  sql += `CREATE TABLE \`sms_logs\` (\n`;
  sql += `  \`id\` VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  \`businessId\` VARCHAR(64) NOT NULL,\n`;
  sql += `  \`customerId\` VARCHAR(64),\n`;
  sql += `  \`customerName\` VARCHAR(255),\n`;
  sql += `  \`phone\` VARCHAR(32),\n`;
  sql += `  \`message\` TEXT,\n`;
  sql += `  \`templateType\` VARCHAR(64),\n`;
  sql += `  \`status\` VARCHAR(32),\n`;
  sql += `  \`gateway\` VARCHAR(64),\n`;
  sql += `  \`date\` DATETIME DEFAULT CURRENT_TIMESTAMP\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  if (dbData.smsLogs && dbData.smsLogs.length > 0) {
    sql += `INSERT INTO \`sms_logs\` VALUES \n`;
    const rows = dbData.smsLogs.map(s => 
      `(${escapeSql(s.id)}, ${escapeSql(s.businessId)}, ${escapeSql(s.customerId)}, ${escapeSql(s.customerName)}, ${escapeSql(s.phone)}, ${escapeSql(s.message)}, ${escapeSql(s.templateType)}, ${escapeSql(s.status)}, ${escapeSql(s.gateway)}, ${escapeSql(s.date)})`
    );
    sql += rows.join(',\n') + ';\n\n';
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  sql += `-- ================= END OF SQL DUMP =================\n`;

  fs.writeFileSync(outputPath, sql, 'utf8');
  console.log(`[SUCCESS] Generated complete MySQL database dump: ${outputPath}`);
}

generateSqlDump();
