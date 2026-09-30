const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');
const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Identify real business IDs (exclude test_ accounts)
const realBusinesses = (dbData.businesses || []).filter(b => !b.email.startsWith('test_') && b.businessName !== 'Apex Retailers & Co.');
const realBizIds = new Set(realBusinesses.map(b => b.id));

console.log(`Retaining ${realBusinesses.length} real business(es):`, realBusinesses.map(b => `${b.businessName} (${b.email})`));

// Filter all collections by real business IDs
const cleanedData = {
  businesses: realBusinesses,
  customers: (dbData.customers || []).filter(c => realBizIds.has(c.businessId)),
  products: (dbData.products || []).filter(p => realBizIds.has(p.businessId)),
  invoices: (dbData.invoices || []).filter(i => realBizIds.has(i.businessId)),
  sales: (dbData.sales || []).filter(s => realBizIds.has(s.businessId)),
  stockLogs: (dbData.stockLogs || []).filter(s => realBizIds.has(s.businessId)),
  smsLogs: (dbData.smsLogs || []).filter(s => realBizIds.has(s.businessId)),
  expenses: (dbData.expenses || []).filter(e => realBizIds.has(e.businessId)),
  suppliers: (dbData.suppliers || []).filter(s => realBizIds.has(s.businessId)),
  purchases: (dbData.purchases || []).filter(p => realBizIds.has(p.businessId))
};

fs.writeFileSync(dbPath, JSON.stringify(cleanedData, null, 2), 'utf8');
console.log('Database cleaned successfully! Only real user data retained.');
