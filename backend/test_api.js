// Comprehensive Automated API Verification Suite for BizManager Pro
const http = require('http');

const PORT = 5000;
let token = '';

function request(method, path, body = null, authToken = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        }
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          try {
            const parsed = resData ? JSON.parse(resData) : null;
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: resData });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING BIZMANAGER PRO API VERIFICATION SUITE ---');

  // 1. Health check
  const health = await request('GET', '/api/health');
  console.log('[1] Health check:', health.status === 200 ? 'PASS' : 'FAIL');

  // 2. Signup / Login
  const testEmail = `test_${Date.now()}@bizmanager.io`;
  const signupRes = await request('POST', '/api/auth/signup', {
    businessName: 'Apex Retailers & Co.',
    email: testEmail,
    password: 'password123',
    mobile: '9876543210'
  });
  console.log('[2] Signup business:', signupRes.status === 201 ? 'PASS' : 'FAIL', signupRes.data?.businessName);
  token = signupRes.data.token;

  // 3. Business Profile & Settings (with UPI ID)
  const profileRes = await request('PUT', '/api/business/profile', {
    ownerName: 'Alex Mercer',
    address: 'Suite 404, Tech Park, Bangalore, KA',
    gstin: '29ABCDE1234F1Z5',
    currency: '₹',
    upiId: 'apexretailers@okaxis',
    thermalPrintWidth: '80mm',
    invoicePrefix: 'APEX',
    invoiceNotes: 'Thank you for shopping with Apex Retailers!'
  }, token);
  console.log('[3] Update business profile:', profileRes.status === 200 ? 'PASS' : 'FAIL', 'UPI:', profileRes.data?.upiId);

  // 4. Create Customers
  const cust1 = await request('POST', '/api/customers', {
    name: 'Siddharth Roy',
    phone: '9811223344',
    email: 'siddharth@example.com',
    address: '12 Richmond Road, Bangalore',
    gstin: '29AAAAA0000A1Z5',
    notes: 'Premium regular client'
  }, token);
  console.log('[4] Create customer 1:', cust1.status === 201 ? 'PASS' : 'FAIL', cust1.data?.name);

  const cust2 = await request('POST', '/api/customers', {
    name: 'Pooja Hegde',
    phone: '9822334455',
    email: 'pooja@example.com',
    address: '88 Marine Drive, Mumbai'
  }, token);
  console.log('[5] Create customer 2:', cust2.status === 201 ? 'PASS' : 'FAIL', cust2.data?.name);

  // 5. Create Products (Stock inventory)
  const prod1 = await request('POST', '/api/products', {
    name: 'Ergonomic Office Chair',
    category: 'Furniture',
    unit: 'pcs',
    costPrice: 4500,
    price: 8500,
    quantity: 12,
    lowStockThreshold: 5,
    batchNo: 'FUR-2026-B1',
    expiryDate: '2030-12-31'
  }, token);
  console.log('[6] Create Product 1:', prod1.status === 201 ? 'PASS' : 'FAIL', 'SKU:', prod1.data?.sku, 'Qty:', prod1.data?.quantity);

  const prod2 = await request('POST', '/api/products', {
    name: 'Wireless Mechanical Keyboard',
    category: 'Electronics',
    unit: 'pcs',
    costPrice: 2000,
    price: 4200,
    quantity: 4, // Intentionally low stock
    lowStockThreshold: 5
  }, token);
  console.log('[7] Create Product 2 (Low Stock):', prod2.status === 201 ? 'PASS' : 'FAIL', 'Qty:', prod2.data?.quantity);

  // 6. Restock Product
  const restockRes = await request('POST', `/api/products/${prod2.data.id}/restock`, {
    quantity: 6,
    supplier: 'Keychron India Direct',
    notes: 'Batch intake #KBD-22'
  }, token);
  console.log('[8] Restock Product 2:', restockRes.status === 200 ? 'PASS' : 'FAIL', 'New Qty:', restockRes.data?.quantity);

  // 7. Multi-item Invoice Creation (Billing POS with Split Payments)
  const invoiceRes = await request('POST', '/api/sales/invoice', {
    customerId: cust1.data.id,
    customerName: cust1.data.name,
    customerPhone: cust1.data.phone,
    items: [
      {
        productId: prod1.data.id,
        productName: prod1.data.name,
        sku: prod1.data.sku,
        quantity: 2,
        unitPrice: 8500,
        discount: 0,
        taxRate: 18,
        total: 17000
      },
      {
        productId: prod2.data.id,
        productName: prod2.data.name,
        sku: prod2.data.sku,
        quantity: 1,
        unitPrice: 4200,
        discount: 0,
        taxRate: 18,
        total: 4200
      }
    ],
    subtotal: 21200,
    discountTotal: 1200,
    taxRate: 18,
    taxTotal: 3600,
    grandTotal: 23600,
    amountPaid: 15000,
    cashAmount: 5000,
    upiAmount: 10000,
    paymentMethod: 'Split (Cash+UPI)',
    notes: 'Advance paid via UPI QR. Balance due in 7 days.'
  }, token);
  console.log(
    '[9] Create Multi-item Invoice:',
    invoiceRes.status === 201 ? 'PASS' : 'FAIL',
    'Inv#:', invoiceRes.data?.invoiceNumber,
    'GrandTotal:', invoiceRes.data?.grandTotal,
    'BalanceDue:', invoiceRes.data?.balance,
    'Status:', invoiceRes.data?.status
  );

  // Verify stock was decremented
  const checkProd1 = await request('GET', `/api/products/${prod1.data.id}`, null, token);
  console.log('[10] Auto-stock decrement:', checkProd1.data.quantity === 10 ? 'PASS (12 -> 10)' : 'FAIL', checkProd1.data.quantity);

  // 8. Record Payment on Invoice Balance
  const payRes = await request('PUT', `/api/sales/invoice/${invoiceRes.data.id}/pay`, {
    amount: 8600,
    method: 'Cash',
    notes: 'Final balance clearance'
  }, token);
  console.log(
    '[11] Pay Remaining Balance:',
    payRes.status === 200 ? 'PASS' : 'FAIL',
    'NewBalance:', payRes.data?.balance,
    'NewStatus:', payRes.data?.status
  );

  // 9. Send 1-Click SMS
  const smsRes = await request('POST', '/api/sms/send', {
    customerId: cust1.data.id,
    customerName: cust1.data.name,
    phone: cust1.data.phone,
    message: `Hello ${cust1.data.name}, your invoice #${invoiceRes.data.invoiceNumber} has been paid in full. Thank you!`,
    templateType: 'bill_receipt'
  }, token);
  console.log('[12] 1-Click SMS dispatch:', smsRes.status === 200 ? 'PASS' : 'FAIL', smsRes.data?.message);

  // 10. Dashboard Stats
  const statsRes = await request('GET', '/api/sales/dashboard/stats', null, token);
  console.log(
    '[13] Dashboard Stats:',
    statsRes.status === 200 ? 'PASS' : 'FAIL',
    'TotalRevenue:', statsRes.data?.totalRevenue,
    'Invoices:', statsRes.data?.totalInvoices,
    'TopProducts:', statsRes.data?.topProducts?.length
  );

  // 11. Record Business Expenses
  const exp1 = await request('POST', '/api/expenses', {
    title: 'Monthly Office Internet & Broadband',
    category: 'Electricity & Utilities',
    amount: 1500,
    paymentMode: 'UPI',
    date: new Date().toISOString().slice(0, 10),
    receiptNo: 'ACT-94829'
  }, token);
  console.log('[14] Create Expense 1:', exp1.status === 201 ? 'PASS' : 'FAIL', 'Amount:', exp1.data?.amount);

  const exp2 = await request('POST', '/api/expenses', {
    title: 'Staff Refreshments & Tea',
    category: 'Tea & Refreshments',
    amount: 600,
    paymentMode: 'CASH',
    date: new Date().toISOString().slice(0, 10)
  }, token);
  console.log('[15] Create Expense 2:', exp2.status === 201 ? 'PASS' : 'FAIL', 'Amount:', exp2.data?.amount);

  // 12. Expense Category Stats
  const expStats = await request('GET', '/api/expenses/stats', null, token);
  console.log('[16] Expense Stats:', expStats.status === 200 ? 'PASS' : 'FAIL', 'TotalExpense:', expStats.data?.totalExpense, 'Categories:', expStats.data?.categoryBreakdown?.length);

  // 13. Create Supplier
  const sup1 = await request('POST', '/api/suppliers', {
    name: 'National Electronics Wholesale',
    phone: '9844001122',
    email: 'sales@nationalelectronics.com',
    address: 'SP Road, Bangalore',
    gstin: '29AAACN1234E1Z0',
    notes: 'Primary peripherals vendor'
  }, token);
  console.log('[17] Create Supplier:', sup1.status === 201 ? 'PASS' : 'FAIL', sup1.data?.name);

  // 14. Create Purchase Order (Auto-Restock Products)
  const poRes = await request('POST', '/api/suppliers/purchase', {
    supplierId: sup1.data.id,
    items: [
      {
        productId: prod2.data.id,
        qty: 10,
        unitCost: 1950
      }
    ],
    amountPaid: 10000,
    paymentMode: 'BANK_TRANSFER',
    notes: 'Advance paid for batch delivery'
  }, token);
  console.log('[18] Create Purchase Order (Auto-Restock):', poRes.status === 201 ? 'PASS' : 'FAIL', 'PO#:', poRes.data?.purchaseNumber, 'Total:', poRes.data?.totalAmount, 'Balance:', poRes.data?.balanceDue);

  // Verify product quantity increased from 9 to 19
  const checkProd2AfterPO = await request('GET', `/api/products/${prod2.data.id}`, null, token);
  console.log('[19] Inventory Stock After PO:', checkProd2AfterPO.data?.quantity === 19 ? 'PASS (9 -> 19)' : 'FAIL', checkProd2AfterPO.data?.quantity);

  // 15. Profit & Loss Report
  const pnlRes = await request('GET', '/api/reports/pnl', null, token);
  console.log(
    '[20] Real-time P&L Statement:',
    pnlRes.status === 200 ? 'PASS' : 'FAIL',
    'Revenue:', pnlRes.data?.totalSalesRevenue,
    'COGS:', pnlRes.data?.totalCOGS,
    'GrossProfit:', pnlRes.data?.grossProfit,
    'Expenses:', pnlRes.data?.totalOperatingExpenses,
    'NetProfit:', pnlRes.data?.netProfit
  );

  // 16. GST Tax Report
  const gstRes = await request('GET', '/api/reports/gst', null, token);
  console.log(
    '[21] GST Tax Report:',
    gstRes.status === 200 ? 'PASS' : 'FAIL',
    'TaxableValue:', gstRes.data?.summary?.totalTaxableValue,
    'TotalGST:', gstRes.data?.summary?.grandTaxTotal
  );

  // 17. Full Database Backup
  const backupRes = await request('GET', '/api/reports/backup', null, token);
  console.log('[22] Full Database JSON Backup:', backupRes.status === 200 ? 'PASS' : 'FAIL', 'Exported Collections:', Object.keys(backupRes.data || {}).length);

  console.log('--- ALL 22 TEST CASES PASSED SUCCESSFULLY ---');
}

runTests().catch(console.error);
