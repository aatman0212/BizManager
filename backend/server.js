const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const productRoutes = require('./routes/products');
const salesRoutes = require('./routes/sales');
const smsRoutes = require('./routes/sms');
const businessRoutes = require('./routes/business');
const expenseRoutes = require('./routes/expenses');
const supplierRoutes = require('./routes/suppliers');
const reportRoutes = require('./routes/reports');
const { initMySQL } = require('./mysql_sync');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Live MySQL Sync (phpMyAdmin `bizmanager_db`)
initMySQL();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', authMiddleware, customerRoutes);
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/sales', authMiddleware, salesRoutes);
app.use('/api/sms', authMiddleware, smsRoutes);
app.use('/api/business', authMiddleware, businessRoutes);
app.use('/api/expenses', authMiddleware, expenseRoutes);
app.use('/api/suppliers', authMiddleware, supplierRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BizManager API is running.' });
});

// Serve frontend static build in single-folder fullstack deployment
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 BizManager Full-Stack Application is Live!`);
  console.log(`👉 Access URL: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
