const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const auth = require('../middleware/auth');
const { syncSupplier, syncPurchase, deleteFromMySQL, syncProduct, syncStockLog } = require('../mysql_sync');

// GET /api/suppliers - List all suppliers for the authenticated business
router.get('/', auth, (req, res) => {
  try {
    const suppliers = db
      .get('suppliers')
      .filter({ businessId: req.businessId })
      .value() || [];

    // Calculate dynamic totals from purchases
    const purchases = db
      .get('purchases')
      .filter({ businessId: req.businessId })
      .value() || [];

    const enriched = suppliers.map((sup) => {
      const supPurchases = purchases.filter((p) => p.supplierId === sup.id);
      const totalPurchased = supPurchases.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0);
      const totalPaid = supPurchases.reduce((s, p) => s + (Number(p.amountPaid) || 0), 0);
      const balancePayable = totalPurchased - totalPaid;

      return {
        ...sup,
        totalPurchased,
        totalPaid,
        balancePayable,
        purchaseCount: supPurchases.length
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching suppliers', error: err.message });
  }
});

// POST /api/suppliers - Create a new supplier
router.post('/', auth, (req, res) => {
  try {
    const { name, phone, email, address, gstin, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Supplier name is required.' });
    }

    const newSupplier = {
      id: uuidv4(),
      businessId: req.businessId,
      name: name.trim(),
      phone: phone ? phone.trim() : '',
      email: email ? email.trim() : '',
      address: address ? address.trim() : '',
      gstin: gstin ? gstin.trim().toUpperCase() : '',
      notes: notes ? notes.trim() : '',
      createdAt: new Date().toISOString()
    };

    db.get('suppliers').push(newSupplier).write();
    syncSupplier(newSupplier);
    res.status(201).json(newSupplier);
  } catch (err) {
    res.status(500).json({ message: 'Error creating supplier', error: err.message });
  }
});

// PUT /api/suppliers/:id - Update supplier details
router.put('/:id', auth, (req, res) => {
  try {
    const supplier = db
      .get('suppliers')
      .find({ id: req.params.id, businessId: req.businessId })
      .value();

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }

    const { name, phone, email, address, gstin, notes } = req.body;

    db.get('suppliers')
      .find({ id: req.params.id, businessId: req.businessId })
      .assign({
        name: name ? name.trim() : supplier.name,
        phone: phone !== undefined ? phone.trim() : supplier.phone,
        email: email !== undefined ? email.trim() : supplier.email,
        address: address !== undefined ? address.trim() : supplier.address,
        gstin: gstin !== undefined ? gstin.trim().toUpperCase() : supplier.gstin,
        notes: notes !== undefined ? notes.trim() : supplier.notes
      })
      .write();

    const updated = db.get('suppliers').find({ id: req.params.id }).value();
    syncSupplier(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Error updating supplier', error: err.message });
  }
});

// DELETE /api/suppliers/:id - Delete supplier
router.delete('/:id', auth, (req, res) => {
  try {
    const supplier = db
      .get('suppliers')
      .find({ id: req.params.id, businessId: req.businessId })
      .value();

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }

    db.get('suppliers')
      .remove({ id: req.params.id, businessId: req.businessId })
      .write();

    deleteFromMySQL('suppliers', req.params.id);
    res.json({ message: 'Supplier deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting supplier', error: err.message });
  }
});

// GET /api/suppliers/purchases - List all purchase orders
router.get('/purchases', auth, (req, res) => {
  try {
    const purchases = db
      .get('purchases')
      .filter({ businessId: req.businessId })
      .value() || [];

    purchases.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching purchase orders', error: err.message });
  }
});

// POST /api/suppliers/purchase - Create Purchase Order and automatically restock inventory
router.post('/purchase', auth, (req, res) => {
  try {
    const {
      supplierId,
      items, // [{ productId, productName, sku, qty, unitCost }]
      amountPaid = 0,
      paymentMode = 'CASH',
      notes = ''
    } = req.body;

    if (!supplierId) {
      return res.status(400).json({ message: 'Supplier is required.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required in the Purchase Order.' });
    }

    const supplier = db
      .get('suppliers')
      .find({ id: supplierId, businessId: req.businessId })
      .value();

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }

    // Auto-generate PO Number: PO-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const poCount = (db.get('purchases').filter({ businessId: req.businessId }).value() || []).length + 1;
    const purchaseNumber = `PO-${dateStr}-${String(poCount).padStart(4, '0')}`;

    let totalAmount = 0;
    const processedItems = [];

    // Increment inventory stock & update product cost price
    items.forEach((item) => {
      const qty = parseInt(item.qty, 10);
      const unitCost = parseFloat(item.unitCost) || 0;
      const lineTotal = qty * unitCost;
      totalAmount += lineTotal;

      const product = db
        .get('products')
        .find({ id: item.productId, businessId: req.businessId })
        .value();

      if (product) {
        const prevQty = product.quantity || 0;
        const newQty = prevQty + qty;

        db.get('products')
          .find({ id: item.productId, businessId: req.businessId })
          .assign({
            quantity: newQty,
            costPrice: unitCost > 0 ? unitCost : product.costPrice
          })
          .write();

        // Log stock addition
        db.get('stockLogs')
          .push({
            id: uuidv4(),
            businessId: req.businessId,
            productId: item.productId,
            productName: product.name,
            type: 'RESTOCK_PURCHASE',
            quantity: qty,
            previousQuantity: prevQty,
            newQuantity: newQty,
            reason: `Purchase Order #${purchaseNumber} from ${supplier.name}`,
            date: new Date().toISOString()
          })
          .write();

        processedItems.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          qty,
          unitCost,
          lineTotal
        });
      }
    });

    const parsedPaid = parseFloat(amountPaid) || 0;
    const balanceDue = Math.max(0, totalAmount - parsedPaid);

    const newPurchase = {
      id: uuidv4(),
      businessId: req.businessId,
      purchaseNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: new Date().toISOString(),
      items: processedItems,
      totalAmount,
      amountPaid: parsedPaid,
      balanceDue,
      paymentMode,
      notes: notes ? notes.trim() : '',
      createdAt: new Date().toISOString()
    };

    db.get('purchases').push(newPurchase).write();
    syncPurchase(newPurchase);

    res.status(201).json(newPurchase);
  } catch (err) {
    res.status(500).json({ message: 'Error processing purchase order', error: err.message });
  }
});

// POST /api/suppliers/:id/pay - Record vendor payment towards outstanding balance
router.post('/:id/pay', auth, (req, res) => {
  try {
    const { amount, paymentMode = 'CASH', notes = '' } = req.body;
    const payAmount = parseFloat(amount);

    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than 0.' });
    }

    const supplier = db
      .get('suppliers')
      .find({ id: req.params.id, businessId: req.businessId })
      .value();

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }

    // Allocate payment across unpaid purchases
    let remainingPay = payAmount;
    const purchases = db
      .get('purchases')
      .filter({ supplierId: supplier.id, businessId: req.businessId })
      .value() || [];

    purchases.sort((a, b) => new Date(a.date) - new Date(b.date)); // Oldest first

    for (const p of purchases) {
      if (remainingPay <= 0) break;
      if (p.balanceDue > 0) {
        const canPay = Math.min(p.balanceDue, remainingPay);
        const newPaid = (p.amountPaid || 0) + canPay;
        const newBal = p.totalAmount - newPaid;

        db.get('purchases')
          .find({ id: p.id })
          .assign({ amountPaid: newPaid, balanceDue: newBal })
          .write();

        remainingPay -= canPay;
      }
    }

    res.json({ message: `Payment of ₹${payAmount} recorded successfully for ${supplier.name}!` });
  } catch (err) {
    res.status(500).json({ message: 'Error recording supplier payment', error: err.message });
  }
});

module.exports = router;
