const express = require('express');
const db = require('../db');
const { syncBusiness } = require('../mysql_sync');

const router = express.Router();

// GET /api/business/profile - get current business details & settings
router.get('/profile', (req, res) => {
  const businessId = req.user.businessId;
  const business = db.get('businesses').find({ id: businessId }).value();

  if (!business) {
    return res.status(404).json({ message: 'Business not found.' });
  }

  // Do not expose password hash
  const { password, ...safeData } = business;
  res.json({
    id: safeData.id,
    businessName: safeData.businessName || 'My Business',
    ownerName: safeData.ownerName || '',
    email: safeData.email || '',
    mobile: safeData.mobile || '',
    address: safeData.address || '',
    gstin: safeData.gstin || '',
    currency: safeData.currency || '₹',
    upiId: safeData.upiId || '',
    thermalPrintWidth: safeData.thermalPrintWidth || '80mm',
    invoicePrefix: safeData.invoicePrefix || 'INV',
    invoiceNotes: safeData.invoiceNotes || 'Thank you for your business! Items once sold can be exchanged within 7 days.',
    smsConfig: safeData.smsConfig || {
      provider: 'simulator',
      twilioSid: '',
      twilioAuthToken: '',
      twilioFrom: '',
      fast2smsApiKey: '',
      senderId: 'BIZMAN'
    },
    createdAt: safeData.createdAt
  });
});

// PUT /api/business/profile - update business details
router.put('/profile', (req, res) => {
  const businessId = req.user.businessId;
  const business = db.get('businesses').find({ id: businessId }).value();

  if (!business) {
    return res.status(404).json({ message: 'Business not found.' });
  }

  const {
    businessName,
    ownerName,
    mobile,
    address,
    gstin,
    currency,
    upiId,
    thermalPrintWidth,
    invoicePrefix,
    invoiceNotes,
    smsConfig
  } = req.body;

  const updatedFields = {};
  if (businessName !== undefined) updatedFields.businessName = businessName.trim();
  if (ownerName !== undefined) updatedFields.ownerName = ownerName.trim();
  if (mobile !== undefined) updatedFields.mobile = mobile.trim();
  if (address !== undefined) updatedFields.address = address.trim();
  if (gstin !== undefined) updatedFields.gstin = gstin.trim().toUpperCase();
  if (currency !== undefined) updatedFields.currency = currency.trim();
  if (upiId !== undefined) updatedFields.upiId = upiId.trim();
  if (thermalPrintWidth !== undefined) updatedFields.thermalPrintWidth = thermalPrintWidth;
  if (invoicePrefix !== undefined) updatedFields.invoicePrefix = invoicePrefix.trim().toUpperCase();
  if (invoiceNotes !== undefined) updatedFields.invoiceNotes = invoiceNotes.trim();
  if (smsConfig !== undefined) {
    updatedFields.smsConfig = {
      ...(business.smsConfig || {}),
      ...smsConfig
    };
  }

  db.get('businesses')
    .find({ id: businessId })
    .assign(updatedFields)
    .write();

  const updated = db.get('businesses').find({ id: businessId }).value();
  syncBusiness(updated);
  const { password, ...safeData } = updated;
  res.json(safeData);
});

// POST /api/business/reset-data - Reset all transactional & entity data for a clean start
router.post('/reset-data', async (req, res) => {
  try {
    const businessId = req.user.businessId;

    // Reset LowDB collections scoped to this business
    db.get('customers').remove({ businessId }).write();
    db.get('products').remove({ businessId }).write();
    db.get('invoices').remove({ businessId }).write();
    db.get('invoice_items').remove({ businessId }).write();
    db.get('suppliers').remove({ businessId }).write();
    db.get('purchase_orders').remove({ businessId }).write();
    db.get('purchase_items').remove({ businessId }).write();
    db.get('expenses').remove({ businessId }).write();
    db.get('stock_logs').remove({ businessId }).write();
    db.get('sms_logs').remove({ businessId }).write();
    db.get('sales').remove({ businessId }).write();

    // Reset MySQL tables
    try {
      const mysql = require('mysql2/promise');
      const conn = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'bizmanager_db'
      });

      await conn.query('DELETE FROM invoice_items WHERE businessId = ?', [businessId]);
      await conn.query('DELETE FROM invoices WHERE businessId = ?', [businessId]);
      await conn.query('DELETE FROM purchase_items WHERE businessId = ?', [businessId]);
      await conn.query('DELETE FROM purchase_orders WHERE businessId = ?', [businessId]);
      await conn.query('DELETE FROM customers WHERE businessId = ?', [businessId]);
      await conn.query('DELETE FROM products WHERE businessId = ?', [businessId]);
      await conn.query('DELETE FROM suppliers WHERE businessId = ?', [businessId]);
      await conn.query('DELETE FROM expenses WHERE businessId = ?', [businessId]);
      await conn.query('DELETE FROM stock_logs WHERE businessId = ?', [businessId]);
      await conn.query('DELETE FROM sms_logs WHERE businessId = ?', [businessId]);

      await conn.end();
    } catch (sqlErr) {
      console.error('MySQL cleanup note:', sqlErr.message);
    }

    res.json({ message: 'Store data reset successfully. You now have a clean slate to set up your shop!' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reset store data', error: err.message });
  }
});

module.exports = router;
