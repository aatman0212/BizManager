const db = require('./db');
const mysql = require('mysql2/promise');

async function resetAllData() {
  console.log('🔄 Starting Store Data Reset for Clean Electronics Shop Setup...');

  const businesses = db.get('businesses').value();
  console.log(`Preserving ${businesses.length} Business Account(s)...`);

  // Reset LowDB collections
  db.set('customers', []).write();
  db.set('products', []).write();
  db.set('invoices', []).write();
  db.set('invoice_items', []).write();
  db.set('suppliers', []).write();
  db.set('purchase_orders', []).write();
  db.set('purchase_items', []).write();
  db.set('expenses', []).write();
  db.set('stock_logs', []).write();
  db.set('sms_logs', []).write();
  db.set('sales', []).write();

  console.log('✅ LowDB collections wiped clean (customers, products, invoices, suppliers, purchases, expenses, stock_logs, sms_logs).');

  // Reset MySQL tables
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'bizmanager_db'
    });

    await conn.query('DELETE FROM invoice_items');
    await conn.query('DELETE FROM invoices');
    await conn.query('DELETE FROM purchase_items');
    await conn.query('DELETE FROM purchase_orders');
    await conn.query('DELETE FROM customers');
    await conn.query('DELETE FROM products');
    await conn.query('DELETE FROM suppliers');
    await conn.query('DELETE FROM expenses');
    await conn.query('DELETE FROM stock_logs');
    await conn.query('DELETE FROM sms_logs');

    await conn.end();
    console.log('✅ MySQL database tables wiped clean in phpMyAdmin (`bizmanager_db`).');
  } catch (err) {
    console.log('⚠️ Note on MySQL cleanup:', err.message);
  }

  console.log('\n🎉 STORE DATA RESET COMPLETE! Ready to set up your fresh Electronics Shop.');
}

resetAllData().catch(console.error);
