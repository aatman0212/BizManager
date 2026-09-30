const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { syncProduct, syncStockLog, deleteFromMySQL } = require('../mysql_sync');

const router = express.Router();

// Helper to generate SKU if not provided
function generateSKU(name, category) {
  const catCode = (category || 'GEN').substring(0, 3).toUpperCase();
  const nameCode = (name || 'PRD').substring(0, 3).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${catCode}-${nameCode}-${rand}`;
}

// GET /api/products (supports ?search=, ?category=, ?lowStockOnly=true)
router.get('/', (req, res) => {
  const { search, category, lowStockOnly } = req.query;
  const businessId = req.user.businessId;
  let products = db.get('products').filter({ businessId }).value() || [];

  if (category && category !== 'All') {
    products = products.filter((p) => p.category?.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const s = search.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.sku && p.sku.toLowerCase().includes(s)) ||
        (p.category && p.category.toLowerCase().includes(s))
    );
  }

  if (lowStockOnly === 'true') {
    products = products.filter((p) => Number(p.quantity) <= Number(p.lowStockThreshold || 5));
  }

  // Sort by name
  products.sort((a, b) => a.name.localeCompare(b.name));

  res.json(products);
});

// GET /api/products/stock-logs - stock movements audit trail
router.get('/stock-logs', (req, res) => {
  const businessId = req.user.businessId;
  const logs = db.get('stockLogs').filter({ businessId }).value() || [];
  res.json(logs.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50));
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const businessId = req.user.businessId;
  const product = db.get('products').find({ id: req.params.id, businessId }).value();
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  res.json(product);
});

// POST /api/products
router.post('/', (req, res) => {
  const { name, sku, category, unit, costPrice, price, quantity, lowStockThreshold } = req.body;
  if (!name || price === undefined || quantity === undefined) {
    return res.status(400).json({ message: 'Name, price, and quantity are required.' });
  }

  const businessId = req.user.businessId;
  const newProduct = {
    id: uuidv4(),
    businessId,
    name: name.trim(),
    sku: sku ? sku.trim().toUpperCase() : generateSKU(name, category),
    category: category ? category.trim() : 'General',
    unit: unit ? unit.trim() : 'pcs',
    costPrice: costPrice !== undefined && costPrice !== '' ? Number(costPrice) : 0,
    price: Number(price),
    quantity: Number(quantity),
    lowStockThreshold: lowStockThreshold !== undefined && lowStockThreshold !== '' ? Number(lowStockThreshold) : 5,
    createdAt: new Date().toISOString()
  };

  db.get('products').push(newProduct).write();
  syncProduct(newProduct);

  // Log initial stock creation
  const initLog = {
    id: uuidv4(),
    businessId,
    productId: newProduct.id,
    productName: newProduct.name,
    type: 'INITIAL',
    quantity: Number(quantity),
    previousQuantity: 0,
    newQuantity: Number(quantity),
    reason: 'Initial stock intake',
    date: new Date().toISOString()
  };
  db.get('stockLogs').push(initLog).write();
  syncStockLog(initLog);

  res.status(201).json(newProduct);
});

// PUT /api/products/:id
router.put('/:id', (req, res) => {
  const businessId = req.user.businessId;
  const product = db.get('products').find({ id: req.params.id, businessId }).value();
  if (!product) return res.status(404).json({ message: 'Product not found.' });

  const { name, sku, category, unit, costPrice, price, quantity, lowStockThreshold } = req.body;
  
  const updatedQuantity = quantity !== undefined ? Number(quantity) : product.quantity;
  if (quantity !== undefined && Number(quantity) !== product.quantity) {
    // Log manual adjustment
    const adjLog = {
      id: uuidv4(),
      businessId,
      productId: product.id,
      productName: name || product.name,
      type: 'ADJUSTMENT',
      quantity: Number(quantity) - product.quantity,
      previousQuantity: product.quantity,
      newQuantity: Number(quantity),
      reason: 'Manual stock adjustment',
      date: new Date().toISOString()
    };
    db.get('stockLogs').push(adjLog).write();
    syncStockLog(adjLog);
  }

  db.get('products')
    .find({ id: req.params.id, businessId })
    .assign({
      name: name !== undefined ? name.trim() : product.name,
      sku: sku !== undefined ? sku.trim().toUpperCase() : product.sku,
      category: category !== undefined ? category.trim() : product.category,
      unit: unit !== undefined ? unit.trim() : (product.unit || 'pcs'),
      costPrice: costPrice !== undefined ? Number(costPrice) : (product.costPrice || 0),
      price: price !== undefined ? Number(price) : product.price,
      quantity: updatedQuantity,
      lowStockThreshold:
        lowStockThreshold !== undefined ? Number(lowStockThreshold) : product.lowStockThreshold
    })
    .write();

  const updatedProduct = db.get('products').find({ id: req.params.id, businessId }).value();
  syncProduct(updatedProduct);
  res.json(updatedProduct);
});

// POST /api/products/:id/restock
router.post('/:id/restock', (req, res) => {
  const businessId = req.user.businessId;
  const product = db.get('products').find({ id: req.params.id, businessId }).value();
  if (!product) return res.status(404).json({ message: 'Product not found.' });

  const { quantity, notes, supplier } = req.body;
  const addQty = Number(quantity);
  if (!addQty || addQty <= 0) {
    return res.status(400).json({ message: 'Provide a positive quantity to restock.' });
  }

  const previousQuantity = product.quantity;
  const newQuantity = previousQuantity + addQty;

  db.get('products')
    .find({ id: req.params.id, businessId })
    .assign({ quantity: newQuantity })
    .write();

  const restockLog = {
    id: uuidv4(),
    businessId,
    productId: product.id,
    productName: product.name,
    type: 'RESTOCK',
    quantity: addQty,
    previousQuantity,
    newQuantity,
    reason: notes || (supplier ? `Restock from ${supplier}` : 'Stock replenishment'),
    date: new Date().toISOString()
  };
  db.get('stockLogs').push(restockLog).write();
  syncStockLog(restockLog);

  const updatedProduct = db.get('products').find({ id: req.params.id, businessId }).value();
  syncProduct(updatedProduct);
  res.json(updatedProduct);
});

// DELETE /api/products/:id
router.delete('/:id', (req, res) => {
  const businessId = req.user.businessId;
  const product = db.get('products').find({ id: req.params.id, businessId }).value();
  if (!product) return res.status(404).json({ message: 'Product not found.' });

  db.get('products').remove({ id: req.params.id, businessId }).write();
  deleteFromMySQL('products', req.params.id);
  res.json({ message: 'Product deleted successfully.' });
});

module.exports = router;
