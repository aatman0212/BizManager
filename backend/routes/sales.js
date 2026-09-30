const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { syncInvoice, syncStockLog, syncProduct, deleteFromMySQL } = require('../mysql_sync');

const router = express.Router();

// Helper to generate Invoice Number (e.g. INV-20260826-0001)
function generateInvoiceNumber(businessId, prefix = 'INV') {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  const invoices = db.get('invoices').filter({ businessId }).value() || [];
  const todayInvoices = invoices.filter(inv => inv.invoiceNumber && inv.invoiceNumber.includes(dateStr));
  const seq = String(todayInvoices.length + 1).padStart(4, '0');
  return `${prefix || 'INV'}-${dateStr}-${seq}`;
}

// GET /api/sales/invoices - list invoices with filters
router.get('/invoices', (req, res) => {
  const businessId = req.user.businessId;
  const { status, search, customerId, startDate, endDate } = req.query;

  let invoices = db.get('invoices').filter({ businessId }).value() || [];

  if (customerId) {
    invoices = invoices.filter(inv => inv.customerId === customerId);
  }

  if (status && status !== 'ALL') {
    invoices = invoices.filter(inv => inv.status?.toUpperCase() === status.toUpperCase());
  }

  if (startDate) {
    invoices = invoices.filter(inv => new Date(inv.date) >= new Date(startDate));
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    invoices = invoices.filter(inv => new Date(inv.date) <= end);
  }

  if (search) {
    const s = search.toLowerCase();
    invoices = invoices.filter(
      inv =>
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(s)) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(s)) ||
        (inv.customerPhone && inv.customerPhone.includes(s))
    );
  }

  // Sort by date descending
  invoices.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json(invoices);
});

// GET /api/sales - legacy alias for invoices
router.get('/', (req, res) => {
  const businessId = req.user.businessId;
  let invoices = db.get('invoices').filter({ businessId }).value() || [];
  invoices.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(invoices);
});

// GET /api/sales/invoice/:id
router.get('/invoice/:id', (req, res) => {
  const businessId = req.user.businessId;
  const invoice = db.get('invoices').find({ id: req.params.id, businessId }).value();
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
  res.json(invoice);
});

// POST /api/sales/invoice - create multi-item invoice / sale
router.post('/invoice', (req, res) => {
  const businessId = req.user.businessId;
  const business = db.get('businesses').find({ id: businessId }).value();

  const {
    customerId,
    customerName,
    customerPhone,
    customerAddress,
    customerGstin,
    items,
    subtotal,
    discountTotal,
    taxTotal,
    taxRate,
    grandTotal,
    amountPaid,
    paymentMethod,
    notes,
    date,
    dueDate
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'At least one item is required in the invoice.' });
  }

  // Verify and find customer if customerId provided
  let custName = customerName || 'Walk-in Customer';
  let custPhone = customerPhone || '';
  let custAddress = customerAddress || '';
  let custGstin = customerGstin || '';

  if (customerId && customerId !== 'WALK_IN') {
    const cust = db.get('customers').find({ id: customerId, businessId }).value();
    if (cust) {
      custName = cust.name;
      custPhone = cust.phone;
      custAddress = cust.address || '';
      custGstin = cust.gstin || '';
    }
  }

  // 1. Stock Validation for all items
  const products = db.get('products').filter({ businessId }).value() || [];
  const stockErrors = [];

  for (const item of items) {
    if (item.productId) {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) {
        stockErrors.push(`Product "${item.productName || 'Unknown'}" not found.`);
      } else if (Number(item.quantity) > prod.quantity) {
        stockErrors.push(
          `Insufficient stock for "${prod.name}". Requested: ${item.quantity}, Available: ${prod.quantity}.`
        );
      }
    }
  }

  if (stockErrors.length > 0) {
    return res.status(400).json({ message: stockErrors.join(' ') });
  }

  // Calculate totals safely
  const calculatedSubtotal = Number(subtotal) || items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.unitPrice || 0)), 0);
  const calculatedDiscount = Number(discountTotal) || 0;
  const calculatedTax = Number(taxTotal) || 0;
  const calculatedGrandTotal = Number(grandTotal) || (calculatedSubtotal - calculatedDiscount + calculatedTax);
  const paid = Math.min(Number(amountPaid) || 0, calculatedGrandTotal);
  const balance = Math.max(0, calculatedGrandTotal - paid);

  let status = 'UNPAID';
  if (balance === 0 && calculatedGrandTotal > 0) {
    status = 'PAID';
  } else if (paid > 0) {
    status = 'PARTIAL';
  }

  const invoiceNumber = generateInvoiceNumber(businessId, business?.invoicePrefix || 'INV');
  const invoiceDate = date || new Date().toISOString();

  const paymentHistory = [];
  if (paid > 0) {
    paymentHistory.push({
      id: uuidv4(),
      amount: paid,
      method: paymentMethod || 'Cash',
      notes: 'Initial payment at billing',
      date: invoiceDate
    });
  }

  const newInvoice = {
    id: uuidv4(),
    invoiceNumber,
    businessId,
    customerId: customerId || 'WALK_IN',
    customerName: custName,
    customerPhone: custPhone,
    customerAddress: custAddress,
    customerGstin: custGstin,
    items: items.map(it => ({
      productId: it.productId || null,
      productName: it.productName,
      sku: it.sku || '',
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      discount: Number(it.discount || 0),
      taxRate: Number(it.taxRate || 0),
      total: Number(it.total || (Number(it.quantity) * Number(it.unitPrice)))
    })),
    subtotal: calculatedSubtotal,
    discountTotal: calculatedDiscount,
    taxTotal: calculatedTax,
    taxRate: Number(taxRate || 0),
    grandTotal: calculatedGrandTotal,
    amountPaid: paid,
    balance,
    paymentMethod: paymentMethod || 'Cash',
    cashAmount: Number(req.body.cashAmount || 0),
    upiAmount: Number(req.body.upiAmount || 0),
    cardAmount: Number(req.body.cardAmount || 0),
    status,
    notes: notes || (business?.invoiceNotes || 'Thank you for your business!'),
    date: invoiceDate,
    dueDate: dueDate || null,
    paymentHistory
  };

  // 2. Decrement product stock & create stock movement audit log
  for (const item of items) {
    if (item.productId) {
      const prod = db.get('products').find({ id: item.productId, businessId }).value();
      if (prod) {
        const prevQty = prod.quantity;
        const newQty = Math.max(0, prevQty - Number(item.quantity));
        db.get('products')
          .find({ id: item.productId, businessId })
          .assign({ quantity: newQty })
          .write();

        const updatedProd = db.get('products').find({ id: item.productId, businessId }).value();
        syncProduct(updatedProd);

        const saleLog = {
          id: uuidv4(),
          businessId,
          productId: prod.id,
          productName: prod.name,
          type: 'SALE',
          quantity: -Number(item.quantity),
          previousQuantity: prevQty,
          newQuantity: newQty,
          reason: `Invoice #${invoiceNumber}`,
          date: invoiceDate
        };

        db.get('stockLogs').push(saleLog).write();
        syncStockLog(saleLog);
      }
    }
  }

  // 3. Save invoice
  db.get('invoices').push(newInvoice).write();
  syncInvoice(newInvoice);

  res.status(201).json(newInvoice);
});

// PUT /api/sales/invoice/:id/pay - record payment against invoice balance
router.put('/invoice/:id/pay', (req, res) => {
  const businessId = req.user.businessId;
  const invoice = db.get('invoices').find({ id: req.params.id, businessId }).value();
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });

  const { amount, method, notes } = req.body;
  const payAmount = Number(amount);
  if (!payAmount || payAmount <= 0) {
    return res.status(400).json({ message: 'Please provide a valid payment amount.' });
  }

  if (invoice.balance <= 0) {
    return res.status(400).json({ message: 'This invoice is already fully paid.' });
  }

  const actualPay = Math.min(payAmount, invoice.balance);
  const newAmountPaid = invoice.amountPaid + actualPay;
  const newBalance = Math.max(0, invoice.grandTotal - newAmountPaid);
  const newStatus = newBalance === 0 ? 'PAID' : 'PARTIAL';

  const paymentRecord = {
    id: uuidv4(),
    amount: actualPay,
    method: method || 'Cash',
    notes: notes || 'Balance payment',
    date: new Date().toISOString()
  };

  const updatedHistory = [...(invoice.paymentHistory || []), paymentRecord];

  db.get('invoices')
    .find({ id: req.params.id, businessId })
    .assign({
      amountPaid: newAmountPaid,
      balance: newBalance,
      status: newStatus,
      paymentHistory: updatedHistory
    })
    .write();

  const updatedInvoice = db.get('invoices').find({ id: req.params.id, businessId }).value();
  syncInvoice(updatedInvoice);
  res.json(updatedInvoice);
});

// DELETE /api/sales/invoice/:id - cancel/delete invoice & restore stock
router.delete('/invoice/:id', (req, res) => {
  const businessId = req.user.businessId;
  const invoice = db.get('invoices').find({ id: req.params.id, businessId }).value();
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });

  // Restore inventory stock
  if (invoice.items && Array.isArray(invoice.items)) {
    for (const item of invoice.items) {
      if (item.productId) {
        const prod = db.get('products').find({ id: item.productId, businessId }).value();
        if (prod) {
          const prevQty = prod.quantity;
          const newQty = prevQty + Number(item.quantity);
          db.get('products')
            .find({ id: item.productId, businessId })
            .assign({ quantity: newQty })
            .write();

          const restoredProd = db.get('products').find({ id: item.productId, businessId }).value();
          syncProduct(restoredProd);

          db.get('stockLogs').push({
            id: uuidv4(),
            businessId,
            productId: prod.id,
            productName: prod.name,
            type: 'RESTORE',
            quantity: Number(item.quantity),
            previousQuantity: prevQty,
            newQuantity: newQty,
            reason: `Cancelled Invoice #${invoice.invoiceNumber}`,
            date: new Date().toISOString()
          }).write();
        }
      }
    }
  }

  db.get('invoices').remove({ id: req.params.id, businessId }).write();
  res.json({ message: 'Invoice deleted and stock restored.' });
});

// GET /api/sales/dashboard/stats - rich analytics & alerts
router.get('/dashboard/stats', (req, res) => {
  const businessId = req.user.businessId;
  const invoices = db.get('invoices').filter({ businessId }).value() || [];
  const customers = db.get('customers').filter({ businessId }).value() || [];
  const products = db.get('products').filter({ businessId }).value() || [];

  // Totals
  const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.amountPaid) || 0), 0);
  const totalBilled = invoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
  const totalPending = invoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);

  // Today's metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayInvoices = invoices.filter(inv => inv.date && inv.date.startsWith(todayStr));
  const todaySales = todayInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
  const todayRevenue = todayInvoices.reduce((sum, inv) => sum + (Number(inv.amountPaid) || 0), 0);

  // Low stock products list
  const lowStockProducts = products.filter(p => Number(p.quantity) <= Number(p.lowStockThreshold || 5));
  const lowStockCount = lowStockProducts.length;

  // Inventory total value
  const totalInventoryValue = products.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.price || 0)), 0);

  // Sales by Date (last 30 days)
  const salesByDate = {};
  invoices.forEach(inv => {
    if (inv.date) {
      const day = inv.date.split('T')[0];
      salesByDate[day] = (salesByDate[day] || 0) + (Number(inv.grandTotal) || 0);
    }
  });

  // Top selling products by quantity & revenue
  const productTotals = {};
  invoices.forEach(inv => {
    if (inv.items && Array.isArray(inv.items)) {
      inv.items.forEach(it => {
        const name = it.productName || 'Unknown';
        if (!productTotals[name]) {
          productTotals[name] = { qty: 0, revenue: 0 };
        }
        productTotals[name].qty += Number(it.quantity || 0);
        productTotals[name].revenue += Number(it.total || 0);
      });
    }
  });

  const topProducts = Object.entries(productTotals)
    .map(([name, data]) => ({ name, qty: data.qty, revenue: data.revenue }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Recent invoices
  const recentInvoices = invoices
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 7);

  res.json({
    totalRevenue,
    totalBilled,
    totalPending,
    todaySales,
    todayRevenue,
    totalCustomers: customers.length,
    totalProducts: products.length,
    totalInvoices: invoices.length,
    totalInventoryValue,
    lowStockCount,
    lowStockProducts: lowStockProducts.slice(0, 10),
    salesByDate,
    topProducts,
    recentInvoices
  });
});

module.exports = router;
