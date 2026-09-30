const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

// Multi-tenant structure: every customer/product/sale/expense/supplier is tagged with businessId
db.defaults({
  businesses: [], // { id, businessName, ownerName, email, password, mobile, address, gstin, currency, upiId, thermalPrintWidth, invoicePrefix, invoiceNotes, smsConfig, createdAt }
  customers: [],  // { id, businessId, name, phone, email, address, gstin, notes, createdAt }
  products: [],   // { id, businessId, name, sku, category, unit, costPrice, price, quantity, lowStockThreshold, batchNo, expiryDate, createdAt }
  invoices: [],   // { id, invoiceNumber, businessId, customerId, customerName, customerPhone, items, subtotal, discountTotal, taxTotal, grandTotal, amountPaid, balance, paymentMethod, cashAmount, upiAmount, cardAmount, status, notes, date, dueDate, paymentHistory }
  sales: [],      // legacy sales compatibility
  stockLogs: [],  // { id, businessId, productId, productName, type, quantity, previousQuantity, newQuantity, reason, date }
  smsLogs: [],    // { id, businessId, customerId, customerName, phone, message, templateType, status, gateway, date }
  expenses: [],   // { id, businessId, title, category, amount, paymentMode, date, receiptNo, notes, createdAt }
  suppliers: [],  // { id, businessId, name, phone, email, address, gstin, totalPurchased, balancePayable, notes, createdAt }
  purchases: []   // { id, businessId, purchaseNumber, supplierId, supplierName, date, items, subtotal, taxTotal, totalAmount, amountPaid, balanceDue, paymentMode, notes, createdAt }
}).write();

module.exports = db;
