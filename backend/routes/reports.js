const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/reports/pnl - Real-time Profit & Loss statement
router.get('/pnl', auth, (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let invoices = db.get('invoices').filter({ businessId: req.businessId }).value() || [];
    let expenses = db.get('expenses').filter({ businessId: req.businessId }).value() || [];
    const products = db.get('products').filter({ businessId: req.businessId }).value() || [];

    // Date filtering
    if (startDate) {
      const start = new Date(startDate);
      invoices = invoices.filter((i) => new Date(i.date) >= start);
      expenses = expenses.filter((e) => new Date(e.date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      invoices = invoices.filter((i) => new Date(i.date) <= end);
      expenses = expenses.filter((e) => new Date(e.date) <= end);
    }

    // 1. Total Revenue (Sales)
    const totalSalesRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
    const totalDiscountGiven = invoices.reduce((sum, inv) => sum + (Number(inv.discountTotal) || 0), 0);
    const totalTaxCollected = invoices.reduce((sum, inv) => sum + (Number(inv.taxTotal) || 0), 0);

    // 2. Cost of Goods Sold (COGS) based on sold items cost price
    let totalCOGS = 0;
    let totalItemsSold = 0;

    invoices.forEach((inv) => {
      if (Array.isArray(inv.items)) {
        inv.items.forEach((item) => {
          const prod = products.find(
            (p) =>
              (item.productId && p.id === item.productId) ||
              (item.sku && p.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) ||
              (item.productName && p.name && p.name.toLowerCase() === item.productName.toLowerCase())
          );
          const cost = prod ? (Number(prod.costPrice) || 0) : (Number(item.costPrice) || Number(item.unitCost) || 0);
          const qty = Number(item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 1)) || 1;
          totalCOGS += cost * qty;
          totalItemsSold += qty;
        });
      }
    });

    // 3. Gross Profit = Sales Revenue - Cost of Goods Sold (COGS)
    const grossProfit = totalSalesRevenue - totalCOGS;

    // 4. Total Operating Expenses
    const totalOperatingExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // 5. Net Business Profit = Gross Profit - Operating Expenses
    const netProfit = grossProfit - totalOperatingExpenses;
    const profitMargin = totalSalesRevenue > 0 ? ((netProfit / totalSalesRevenue) * 100).toFixed(1) : 0;

    res.json({
      totalSalesRevenue,
      netSales: totalSalesRevenue,
      totalTaxCollected,
      totalDiscountGiven,
      totalCOGS,
      totalItemsSold,
      grossProfit,
      totalOperatingExpenses,
      netProfit,
      profitMargin: Number(profitMargin),
      invoiceCount: invoices.length,
      expenseCount: expenses.length
    });
  } catch (err) {
    res.status(500).json({ message: 'Error calculating P&L statement', error: err.message });
  }
});

// GET /api/reports/gst - GST Tax Report by tax slab
router.get('/gst', auth, (req, res) => {
  try {
    const invoices = db.get('invoices').filter({ businessId: req.businessId }).value() || [];

    const taxSlabs = {
      '0%': { taxable: 0, cgst: 0, sgst: 0, totalTax: 0, count: 0 },
      '5%': { taxable: 0, cgst: 0, sgst: 0, totalTax: 0, count: 0 },
      '12%': { taxable: 0, cgst: 0, sgst: 0, totalTax: 0, count: 0 },
      '18%': { taxable: 0, cgst: 0, sgst: 0, totalTax: 0, count: 0 },
      '28%': { taxable: 0, cgst: 0, sgst: 0, totalTax: 0, count: 0 }
    };

    let totalTaxableValue = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let grandTaxTotal = 0;

    const invoiceEntries = invoices.map((inv) => {
      const taxable = Number(inv.subtotal) - Number(inv.discountTotal || 0);
      const tax = Number(inv.taxTotal) || 0;
      const rate = inv.items?.[0]?.taxRate ? `${inv.items[0].taxRate}%` : '0%';
      const halfTax = tax / 2;

      totalTaxableValue += taxable;
      totalCGST += halfTax;
      totalSGST += halfTax;
      grandTaxTotal += tax;

      if (taxSlabs[rate]) {
        taxSlabs[rate].taxable += taxable;
        taxSlabs[rate].cgst += halfTax;
        taxSlabs[rate].sgst += halfTax;
        taxSlabs[rate].totalTax += tax;
        taxSlabs[rate].count += 1;
      }

      return {
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        customerName: inv.customerName,
        customerGSTIN: inv.customerGSTIN || 'URP',
        taxableValue: taxable,
        taxRate: rate,
        cgst: halfTax,
        sgst: halfTax,
        totalTax: tax,
        grandTotal: inv.grandTotal
      };
    });

    res.json({
      summary: {
        totalTaxableValue,
        totalCGST,
        totalSGST,
        grandTaxTotal,
        invoiceCount: invoices.length
      },
      taxSlabs,
      invoices: invoiceEntries
    });
  } catch (err) {
    res.status(500).json({ message: 'Error generating GST report', error: err.message });
  }
});

// GET /api/reports/export/csv/:type - Export data as CSV
router.get('/export/csv/:type', auth, (req, res) => {
  try {
    const { type } = req.params;
    let csvContent = '';
    let filename = `bizmanager-${type}-${new Date().toISOString().slice(0, 10)}.csv`;

    if (type === 'products') {
      const products = db.get('products').filter({ businessId: req.businessId }).value() || [];
      csvContent = 'Name,SKU,Category,Unit,CostPrice,SellingPrice,Quantity,LowStockThreshold,BatchNo,ExpiryDate\n';
      products.forEach((p) => {
        csvContent += `"${p.name || ''}","${p.sku || ''}","${p.category || ''}","${p.unit || 'pcs'}",${p.costPrice || 0},${p.price || 0},${p.quantity || 0},${p.lowStockThreshold || 5},"${p.batchNo || ''}","${p.expiryDate || ''}"\n`;
      });
    } else if (type === 'customers') {
      const customers = db.get('customers').filter({ businessId: req.businessId }).value() || [];
      csvContent = 'Name,Phone,Email,Address,GSTIN,Notes\n';
      customers.forEach((c) => {
        csvContent += `"${c.name || ''}","${c.phone || ''}","${c.email || ''}","${c.address || ''}","${c.gstin || ''}","${c.notes || ''}"\n`;
      });
    } else if (type === 'sales') {
      const invoices = db.get('invoices').filter({ businessId: req.businessId }).value() || [];
      csvContent = 'InvoiceNumber,Date,CustomerName,CustomerPhone,Subtotal,Discount,Tax,GrandTotal,AmountPaid,Balance,Status,PaymentMethod\n';
      invoices.forEach((inv) => {
        csvContent += `"${inv.invoiceNumber}","${inv.date}","${inv.customerName || ''}","${inv.customerPhone || ''}",${inv.subtotal || 0},${inv.discountTotal || 0},${inv.taxTotal || 0},${inv.grandTotal || 0},${inv.amountPaid || 0},${inv.balance || 0},"${inv.status || ''}","${inv.paymentMethod || ''}"\n`;
      });
    } else if (type === 'expenses') {
      const expenses = db.get('expenses').filter({ businessId: req.businessId }).value() || [];
      csvContent = 'Title,Category,Amount,PaymentMode,Date,ReceiptNo,Notes\n';
      expenses.forEach((e) => {
        csvContent += `"${e.title}","${e.category}",${e.amount},"${e.paymentMode}","${e.date}","${e.receiptNo || ''}","${e.notes || ''}"\n`;
      });
    } else {
      return res.status(400).json({ message: 'Invalid export type. Supported: products, customers, sales, expenses' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ message: 'Error exporting CSV', error: err.message });
  }
});

// POST /api/reports/import/csv/:type - Bulk Import from CSV
router.post('/import/csv/:type', auth, (req, res) => {
  try {
    const { type } = req.params;
    const { csvData } = req.body;

    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ message: 'CSV data string is required in request body.' });
    }

    const lines = csvData.trim().split('\n');
    if (lines.length <= 1) {
      return res.status(400).json({ message: 'CSV file contains no data rows.' });
    }

    let importedCount = 0;

    if (type === 'products') {
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map((f) => f.replace(/^"|"$/g, '').trim());
        if (row[0]) {
          const newProduct = {
            id: uuidv4(),
            businessId: req.businessId,
            name: row[0],
            sku: row[1] || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
            category: row[2] || 'General',
            unit: row[3] || 'pcs',
            costPrice: parseFloat(row[4]) || 0,
            price: parseFloat(row[5]) || 0,
            quantity: parseInt(row[6], 10) || 0,
            lowStockThreshold: parseInt(row[7], 10) || 5,
            batchNo: row[8] || '',
            expiryDate: row[9] || '',
            createdAt: new Date().toISOString()
          };
          db.get('products').push(newProduct).write();
          importedCount++;
        }
      }
    } else if (type === 'customers') {
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map((f) => f.replace(/^"|"$/g, '').trim());
        if (row[0] && row[1]) {
          const newCustomer = {
            id: uuidv4(),
            businessId: req.businessId,
            name: row[0],
            phone: row[1],
            email: row[2] || '',
            address: row[3] || '',
            gstin: row[4] || '',
            notes: row[5] || '',
            createdAt: new Date().toISOString()
          };
          db.get('customers').push(newCustomer).write();
          importedCount++;
        }
      }
    } else {
      return res.status(400).json({ message: 'Invalid import type. Supported: products, customers' });
    }

    res.json({ message: `Successfully imported ${importedCount} ${type} records!` });
  } catch (err) {
    res.status(500).json({ message: 'Error importing CSV data', error: err.message });
  }
});

// GET /api/reports/backup - Download complete JSON database backup for this business
router.get('/backup', auth, (req, res) => {
  try {
    const businessId = req.businessId;
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      business: db.get('businesses').find({ id: businessId }).value(),
      customers: db.get('customers').filter({ businessId }).value(),
      products: db.get('products').filter({ businessId }).value(),
      invoices: db.get('invoices').filter({ businessId }).value(),
      expenses: db.get('expenses').filter({ businessId }).value(),
      suppliers: db.get('suppliers').filter({ businessId }).value(),
      purchases: db.get('purchases').filter({ businessId }).value(),
      smsLogs: db.get('smsLogs').filter({ businessId }).value(),
      stockLogs: db.get('stockLogs').filter({ businessId }).value()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="bizmanager-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    res.status(500).json({ message: 'Error generating database backup', error: err.message });
  }
});

// POST /api/reports/restore - Restore data from JSON backup
router.post('/restore', auth, (req, res) => {
  try {
    const { backup } = req.body;
    if (!backup || typeof backup !== 'object') {
      return res.status(400).json({ message: 'Valid backup JSON object is required.' });
    }

    const businessId = req.businessId;

    // Restore collections safely by tagging to current businessId
    const restoreItems = (collectionName, items) => {
      if (Array.isArray(items)) {
        // Clear existing items for this business
        db.get(collectionName).remove({ businessId }).write();
        // Insert new items
        items.forEach((item) => {
          db.get(collectionName).push({ ...item, businessId }).write();
        });
      }
    };

    restoreItems('customers', backup.customers);
    restoreItems('products', backup.products);
    restoreItems('invoices', backup.invoices);
    restoreItems('expenses', backup.expenses);
    restoreItems('suppliers', backup.suppliers);
    restoreItems('purchases', backup.purchases);
    restoreItems('smsLogs', backup.smsLogs);
    restoreItems('stockLogs', backup.stockLogs);

    res.json({ message: 'Database backup restored successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Error restoring backup', error: err.message });
  }
});

module.exports = router;
