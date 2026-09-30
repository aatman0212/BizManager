const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { syncCustomer, syncInvoice, deleteFromMySQL } = require('../mysql_sync');

const router = express.Router();

// Helper: attach purchase history & total balance to a customer (scoped to business)
function enrichCustomer(customer, businessId) {
  // Get all multi-item invoices for this customer
  const invoices = db.get('invoices').filter({ customerId: customer.id, businessId }).value() || [];
  
  // Legacy sales support if any
  const legacySales = db.get('sales').filter({ customerId: customer.id, businessId }).value() || [];

  const invoiceTotalPurchases = invoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
  const invoiceTotalPaid = invoices.reduce((sum, inv) => sum + (Number(inv.amountPaid) || 0), 0);
  const invoiceTotalBalance = invoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);

  const legacyTotalPurchases = legacySales.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
  const legacyTotalPaid = legacySales.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
  const legacyTotalBalance = legacySales.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);

  const totalPurchases = invoiceTotalPurchases + legacyTotalPurchases;
  const totalPaid = invoiceTotalPaid + legacyTotalPaid;
  const totalBalance = invoiceTotalBalance + legacyTotalBalance;

  // Combine invoices and sorted by newest first
  const purchaseHistory = [
    ...invoices,
    ...legacySales.map(s => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber || `SALE-${s.id.slice(0, 6).toUpperCase()}`,
      date: s.date,
      grandTotal: s.totalPrice,
      amountPaid: s.amountPaid,
      balance: s.balance,
      status: s.balance <= 0 ? 'PAID' : (s.amountPaid > 0 ? 'PARTIAL' : 'UNPAID'),
      paymentMethod: 'Cash',
      items: [{
        productId: s.productId,
        productName: s.productName,
        quantity: s.quantity,
        unitPrice: s.unitPrice,
        total: s.totalPrice
      }]
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    ...customer,
    invoices: purchaseHistory,
    totalPurchases,
    totalPaid,
    totalBalance,
    lastPurchaseDate: purchaseHistory.length > 0 ? purchaseHistory[0].date : null
  };
}

// GET /api/customers (supports ?search= and ?pendingOnly=true)
router.get('/', (req, res) => {
  const { search, pendingOnly } = req.query;
  const businessId = req.user.businessId;
  let customers = db.get('customers').filter({ businessId }).value() || [];

  if (search) {
    const s = search.toLowerCase();
    customers = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        (c.phone && c.phone.includes(s)) ||
        (c.email && c.email.toLowerCase().includes(s))
    );
  }

  let enriched = customers.map((c) => enrichCustomer(c, businessId));

  if (pendingOnly === 'true') {
    enriched = enriched.filter((c) => c.totalBalance > 0);
  }

  // Sort by name
  enriched.sort((a, b) => a.name.localeCompare(b.name));

  res.json(enriched);
});

// GET /api/customers/:id
router.get('/:id', (req, res) => {
  const businessId = req.user.businessId;
  const customer = db.get('customers').find({ id: req.params.id, businessId }).value();
  if (!customer) return res.status(404).json({ message: 'Customer not found.' });
  res.json(enrichCustomer(customer, businessId));
});

// POST /api/customers
router.post('/', (req, res) => {
  const { name, phone, email, address, gstin, notes } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ message: 'Customer name and phone number are required.' });
  }

  const businessId = req.user.businessId;
  const newCustomer = {
    id: uuidv4(),
    businessId,
    name: name.trim(),
    phone: phone.trim(),
    email: email ? email.trim() : '',
    address: address ? address.trim() : '',
    gstin: gstin ? gstin.trim().toUpperCase() : '',
    notes: notes ? notes.trim() : '',
    createdAt: new Date().toISOString()
  };

  db.get('customers').push(newCustomer).write();
  syncCustomer(newCustomer);
  res.status(201).json(enrichCustomer(newCustomer, businessId));
});

// PUT /api/customers/:id
router.put('/:id', (req, res) => {
  const businessId = req.user.businessId;
  const customer = db.get('customers').find({ id: req.params.id, businessId }).value();
  if (!customer) return res.status(404).json({ message: 'Customer not found.' });

  const { name, phone, email, address, gstin, notes } = req.body;
  db.get('customers')
    .find({ id: req.params.id, businessId })
    .assign({
      name: name !== undefined ? name.trim() : customer.name,
      phone: phone !== undefined ? phone.trim() : customer.phone,
      email: email !== undefined ? email.trim() : (customer.email || ''),
      address: address !== undefined ? address.trim() : (customer.address || ''),
      gstin: gstin !== undefined ? gstin.trim().toUpperCase() : (customer.gstin || ''),
      notes: notes !== undefined ? notes.trim() : (customer.notes || '')
    })
    .write();

  const updated = db.get('customers').find({ id: req.params.id, businessId }).value();
  syncCustomer(updated);
  res.json(enrichCustomer(updated, businessId));
});

// POST /api/customers/:id/pay - Record inward payment towards customer balance
router.post('/:id/pay', (req, res) => {
  try {
    const businessId = req.user.businessId;
    const customer = db.get('customers').find({ id: req.params.id, businessId }).value();
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });

    const { amount, method = 'Cash', notes = '' } = req.body;
    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ message: 'Please provide a valid payment amount greater than 0.' });
    }

    // Find all invoices with pending balance for this customer, sorted oldest first
    const invoices = db.get('invoices')
      .filter({ customerId: req.params.id, businessId })
      .value() || [];

    const unpaidInvoices = invoices
      .filter((inv) => Number(inv.balance) > 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    let remainingToAllocate = payAmount;
    const paymentTimestamp = new Date().toISOString();

    for (const inv of unpaidInvoices) {
      if (remainingToAllocate <= 0) break;

      const currentBalance = Number(inv.balance) || 0;
      const allocate = Math.min(remainingToAllocate, currentBalance);
      const newPaid = (Number(inv.amountPaid) || 0) + allocate;
      const newBalance = Math.max(0, (Number(inv.grandTotal) || 0) - newPaid);
      const newStatus = newBalance === 0 ? 'PAID' : 'PARTIAL';

      const paymentRecord = {
        id: uuidv4(),
        amount: allocate,
        method: method || 'Cash',
        notes: notes ? `Khata Payment: ${notes}` : 'Customer Khata Balance Payment',
        date: paymentTimestamp
      };

      const updatedHistory = [...(inv.paymentHistory || []), paymentRecord];

      db.get('invoices')
        .find({ id: inv.id, businessId })
        .assign({
          amountPaid: newPaid,
          balance: newBalance,
          status: newStatus,
          paymentHistory: updatedHistory
        })
        .write();

      const updatedInv = db.get('invoices').find({ id: inv.id, businessId }).value();
      syncInvoice(updatedInv);

      remainingToAllocate -= allocate;
    }

    // Also settle legacy sales if any balance remains
    if (remainingToAllocate > 0) {
      const sales = db.get('sales')
        .filter({ customerId: req.params.id, businessId })
        .value() || [];

      const unpaidSales = sales
        .filter((s) => Number(s.balance) > 0)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      for (const s of unpaidSales) {
        if (remainingToAllocate <= 0) break;

        const currentBalance = Number(s.balance) || 0;
        const allocate = Math.min(remainingToAllocate, currentBalance);
        const newPaid = (Number(s.amountPaid) || 0) + allocate;
        const newBalance = Math.max(0, (Number(s.totalPrice) || 0) - newPaid);

        db.get('sales')
          .find({ id: s.id, businessId })
          .assign({
            amountPaid: newPaid,
            balance: newBalance
          })
          .write();

        remainingToAllocate -= allocate;
      }
    }

    // Update customer cached balance
    const enriched = enrichCustomer(customer, businessId);
    db.get('customers')
      .find({ id: req.params.id, businessId })
      .assign({ totalBalance: enriched.totalBalance })
      .write();

    const updatedCustomer = db.get('customers').find({ id: req.params.id, businessId }).value();
    syncCustomer(updatedCustomer);

    res.json({
      message: `Payment of ${payAmount} recorded successfully.`,
      customer: enrichCustomer(updatedCustomer, businessId)
    });
  } catch (err) {
    res.status(500).json({ message: 'Error recording customer payment', error: err.message });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', (req, res) => {
  const businessId = req.user.businessId;
  const customer = db.get('customers').find({ id: req.params.id, businessId }).value();
  if (!customer) return res.status(404).json({ message: 'Customer not found.' });

  db.get('customers').remove({ id: req.params.id, businessId }).write();
  db.get('invoices').remove({ customerId: req.params.id, businessId }).write();
  db.get('sales').remove({ customerId: req.params.id, businessId }).write();

  deleteFromMySQL('customers', req.params.id);
  res.json({ message: 'Customer and associated records deleted.' });
});

module.exports = router;
