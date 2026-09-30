const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const {
  syncBusiness,
  syncCustomer,
  syncProduct,
  syncInvoice,
  syncSupplier,
  syncPurchase,
  syncExpense,
  syncStockLog,
  syncSMSLog,
  syncAllFromLowDB
} = require('./mysql_sync');
const mysql = require('mysql2/promise');

async function seedElectronicsStore() {
  console.log('🚀 Seeding comprehensive Sample Data for Electronics & Gadgets Store...');

  const businesses = db.get('businesses').value();
  if (!businesses || businesses.length === 0) {
    console.error('No business found. Please register first.');
    return;
  }

  const business = businesses[0];
  const businessId = business.id;

  // 1. Update Business Profile with realistic Electronics Store Branding
  db.get('businesses')
    .find({ id: businessId })
    .assign({
      businessName: 'Aatman Electronics & Gadgets',
      ownerName: 'Aatman Satra',
      mobile: '7021724584',
      address: 'Shop No. 4 & 5, Galaxy Arcade, Akurli Road, Kandivali East, Mumbai - 400101',
      gstin: '27AAFPS0464B1ZZ',
      currency: '₹',
      upiId: '7021724584@yespop',
      thermalPrintWidth: '80mm',
      invoicePrefix: 'ELEC',
      invoiceNotes: '1 Year Brand Warranty on all electronics. Original invoice & box required for claims. Items once sold can be exchanged within 7 days.'
    })
    .write();

  const updatedBiz = db.get('businesses').find({ id: businessId }).value();
  syncBusiness(updatedBiz);
  console.log('✅ Business profile updated: Aatman Electronics & Gadgets');

  // 2. Suppliers
  const suppliersData = [
    {
      id: uuidv4(),
      businessId,
      name: 'Apex Electronics Distributors Pvt Ltd',
      phone: '9820123456',
      email: 'sales@apexelectronics.in',
      address: 'Plot 18, MIDC Industrial Area, Andheri East, Mumbai',
      gstin: '27AAACA1234A1Z1',
      notes: 'Authorized Distributor for Sony, Samsung, LG & Havells',
      totalPurchases: 185000,
      totalBalance: 0,
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'BrightTech Mobile & IT Supply Co.',
      phone: '9833445566',
      email: 'orders@brighttechsupply.com',
      address: 'Office 304, IT Hub, Sector 17, Vashi, Navi Mumbai',
      gstin: '27BBBPB5678B1Z2',
      notes: 'Primary Wholesaler for Apple, HP, Dell & OnePlus devices',
      totalPurchases: 240000,
      totalBalance: 25000,
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Sonic Audio & Accessories Hub',
      phone: '9811223344',
      email: 'wholesale@sonicaudio.in',
      address: 'Lamington Road Electronic Market, Grant Road, Mumbai',
      gstin: '27CCCPC9012C1Z3',
      notes: 'Direct distributor for boAt, JBL, Anker & SanDisk accessories',
      totalPurchases: 65000,
      totalBalance: 0,
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
    }
  ];

  db.set('suppliers', suppliersData).write();
  for (const s of suppliersData) syncSupplier(s);
  console.log(`✅ Seeded ${suppliersData.length} Suppliers.`);

  // 3. Products
  const productsData = [
    {
      id: uuidv4(),
      businessId,
      name: 'Apple iPhone 15 (128GB, Midnight Black)',
      sku: 'IPH-15-128-BLK',
      category: 'Smartphones',
      unit: 'pcs',
      costPrice: 62000,
      price: 69999,
      quantity: 8,
      lowStockThreshold: 3,
      batchNo: 'APL-2026-08',
      expiryDate: '',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Samsung Galaxy S24 5G (256GB, Onyx Black)',
      sku: 'SAM-S24-256-BLK',
      category: 'Smartphones',
      unit: 'pcs',
      costPrice: 68000,
      price: 74999,
      quantity: 6,
      lowStockThreshold: 2,
      batchNo: 'SAM-2026-Q3',
      expiryDate: '',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'OnePlus Nord CE4 5G (128GB, Celadon Marble)',
      sku: 'OP-NORD-CE4-128',
      category: 'Smartphones',
      unit: 'pcs',
      costPrice: 21000,
      price: 24999,
      quantity: 12,
      lowStockThreshold: 4,
      batchNo: 'OP-2026-B1',
      expiryDate: '',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Apple MacBook Air M2 (8GB RAM, 256GB SSD, Space Grey)',
      sku: 'MBA-M2-8-256-GRY',
      category: 'Laptops & Computers',
      unit: 'pcs',
      costPrice: 84000,
      price: 94990,
      quantity: 4,
      lowStockThreshold: 2,
      batchNo: 'MBA-2026-M2',
      expiryDate: '',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'HP Pavilion 15 (Core i5 13th Gen, 16GB, 512GB SSD)',
      sku: 'HP-PAV-15-I5',
      category: 'Laptops & Computers',
      unit: 'pcs',
      costPrice: 54000,
      price: 61990,
      quantity: 5,
      lowStockThreshold: 2,
      batchNo: 'HP-2026-15G',
      expiryDate: '',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Sony Bravia 55" 4K Google TV (KD-55X74L)',
      sku: 'SNY-TV-55-4K',
      category: 'Smart TVs & Display',
      unit: 'pcs',
      costPrice: 48000,
      price: 57990,
      quantity: 5,
      lowStockThreshold: 2,
      batchNo: 'SNY-2026-74L',
      expiryDate: '',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Samsung 43" Crystal 4K UHD Smart TV (43CUE60)',
      sku: 'SAM-TV-43-4K',
      category: 'Smart TVs & Display',
      unit: 'pcs',
      costPrice: 26000,
      price: 31990,
      quantity: 7,
      lowStockThreshold: 3,
      batchNo: 'SAM-2026-43C',
      expiryDate: '',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Sony WH-1000XM5 Wireless Noise-Cancelling Headphones',
      sku: 'SNY-XM5-BLK',
      category: 'Audio & Sound',
      unit: 'pcs',
      costPrice: 24000,
      price: 29990,
      quantity: 4,
      lowStockThreshold: 2,
      batchNo: 'SNY-XM5-01',
      expiryDate: '',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'JBL Flip 6 Portable Waterproof Bluetooth Speaker',
      sku: 'JBL-FLIP-6-BLK',
      category: 'Audio & Sound',
      unit: 'pcs',
      costPrice: 8000,
      price: 9999,
      quantity: 10,
      lowStockThreshold: 3,
      batchNo: 'JBL-2026-FL6',
      expiryDate: '',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'boAt Airdopes 141 Bluetooth TWS Earbuds (42H Playtime)',
      sku: 'BOAT-AD-141-BLK',
      category: 'Audio & Sound',
      unit: 'pcs',
      costPrice: 900,
      price: 1499,
      quantity: 25,
      lowStockThreshold: 5,
      batchNo: 'BT-2026-141',
      expiryDate: '',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Anker 65W GaN Fast Wall Charger (3-Port USB-C & A)',
      sku: 'ANK-65W-GAN',
      category: 'Cables & Chargers',
      unit: 'pcs',
      costPrice: 2400,
      price: 3499,
      quantity: 18,
      lowStockThreshold: 5,
      batchNo: 'ANK-65W-01',
      expiryDate: '',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'boAt Type-C to Type-C 65W Braided Fast Cable (1.5m)',
      sku: 'BOAT-CC-65W',
      category: 'Cables & Chargers',
      unit: 'pcs',
      costPrice: 250,
      price: 499,
      quantity: 40,
      lowStockThreshold: 10,
      batchNo: 'BT-CBL-2026',
      expiryDate: '',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'SanDisk 128GB Ultra Dual Type-C OTG Flash Drive',
      sku: 'SD-128G-OTG',
      category: 'Storage & IT',
      unit: 'pcs',
      costPrice: 950,
      price: 1399,
      quantity: 30,
      lowStockThreshold: 8,
      batchNo: 'SD-2026-128',
      expiryDate: '',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'LG 260L 3-Star Smart Inverter Double Door Refrigerator',
      sku: 'LG-REF-260L',
      category: 'Home Appliances',
      unit: 'pcs',
      costPrice: 22000,
      price: 26490,
      quantity: 3,
      lowStockThreshold: 2,
      batchNo: 'LG-2026-260',
      expiryDate: '',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Havells 1200W Heavy Soleplate Steam Iron',
      sku: 'HAV-IRON-1200',
      category: 'Home Appliances',
      unit: 'pcs',
      costPrice: 1100,
      price: 1799,
      quantity: 15,
      lowStockThreshold: 4,
      batchNo: 'HAV-2026-STM',
      expiryDate: '',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    }
  ];

  db.set('products', productsData).write();
  for (const p of productsData) syncProduct(p);
  console.log(`✅ Seeded ${productsData.length} Electronics Products.`);

  // 4. Customers
  const customersData = [
    {
      id: uuidv4(),
      businessId,
      name: 'Rahul Sharma',
      phone: '9820112233',
      email: 'rahul.sharma@gmail.com',
      address: 'Flat 402, Sea View Tower, Andheri West, Mumbai',
      gstin: '',
      notes: 'VIP customer, frequent gadget buyer',
      totalPurchases: 70498,
      totalBalance: 0,
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Pooja Mehta',
      phone: '9892334455',
      email: 'pooja.mehta@outlook.com',
      address: 'B-12, Green Acres, Borivali West, Mumbai',
      gstin: '',
      notes: 'Regular customer, EMI/Khata balance',
      totalPurchases: 94990,
      totalBalance: 9990,
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Vikram Singhania (TechCorp Solutions)',
      phone: '9821445566',
      email: 'procurement@techcorp.in',
      address: 'Unit 501, Tech Park, Mindspace, Malad West, Mumbai',
      gstin: '27AABCT8899A1Z4',
      notes: 'Corporate IT Procurement Client (B2B)',
      totalPurchases: 123980,
      totalBalance: 0,
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Sneha Patel',
      phone: '9876554433',
      email: 'sneha.patel92@gmail.com',
      address: 'A-301, Lotus Enclave, Kandivali East, Mumbai',
      gstin: '',
      notes: 'Audio & Accessories buyer',
      totalPurchases: 11498,
      totalBalance: 0,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
    }
  ];

  db.set('customers', customersData).write();
  for (const c of customersData) syncCustomer(c);
  console.log(`✅ Seeded ${customersData.length} Customers.`);

  // 5. Invoices & Invoice Items
  const iphone = productsData[0];
  const cable = productsData[11];
  const macbook = productsData[3];
  const hpLaptop = productsData[4];
  const jblSpeaker = productsData[8];
  const boatEarbuds = productsData[9];

  const invoicesData = [
    {
      id: uuidv4(),
      invoiceNumber: 'ELEC-20260828-0001',
      businessId,
      customerId: customersData[0].id,
      customerName: customersData[0].name,
      customerPhone: customersData[0].phone,
      customerAddress: customersData[0].address,
      customerGstin: customersData[0].gstin,
      items: [
        {
          productId: iphone.id,
          productName: iphone.name,
          sku: iphone.sku,
          quantity: 1,
          unitPrice: iphone.price,
          discount: 0,
          taxRate: 18,
          total: iphone.price
        },
        {
          productId: cable.id,
          productName: cable.name,
          sku: cable.sku,
          quantity: 1,
          unitPrice: cable.price,
          discount: 0,
          taxRate: 18,
          total: cable.price
        }
      ],
      subtotal: 59744.07,
      discountTotal: 0,
      taxTotal: 10753.93,
      taxRate: 18,
      taxMode: 'EXCLUSIVE',
      grandTotal: 70498,
      amountPaid: 70498,
      balance: 0,
      paymentMethod: 'UPI',
      cashAmount: 0,
      upiAmount: 70498,
      cardAmount: 0,
      status: 'PAID',
      notes: 'Thank you for shopping at Aatman Electronics!',
      date: new Date(Date.now() - 2 * 86400000).toISOString(),
      dueDate: null,
      paymentHistory: [
        {
          id: uuidv4(),
          amount: 70498,
          method: 'UPI',
          notes: 'Paid via GooglePay UPI',
          date: new Date(Date.now() - 2 * 86400000).toISOString()
        }
      ]
    },
    {
      id: uuidv4(),
      invoiceNumber: 'ELEC-20260829-0002',
      businessId,
      customerId: customersData[1].id,
      customerName: customersData[1].name,
      customerPhone: customersData[1].phone,
      customerAddress: customersData[1].address,
      customerGstin: customersData[1].gstin,
      items: [
        {
          productId: macbook.id,
          productName: macbook.name,
          sku: macbook.sku,
          quantity: 1,
          unitPrice: macbook.price,
          discount: 0,
          taxRate: 18,
          total: macbook.price
        }
      ],
      subtotal: 80500,
      discountTotal: 0,
      taxTotal: 14490,
      taxRate: 18,
      taxMode: 'EXCLUSIVE',
      grandTotal: 94990,
      amountPaid: 85000,
      balance: 9990,
      paymentMethod: 'Card',
      cashAmount: 0,
      upiAmount: 0,
      cardAmount: 85000,
      status: 'PARTIAL',
      notes: 'Initial card swipe ₹85,000. Balance ₹9,990 due on 5th.',
      date: new Date(Date.now() - 1 * 86400000).toISOString(),
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      paymentHistory: [
        {
          id: uuidv4(),
          amount: 85000,
          method: 'Card',
          notes: 'Initial HDFC POS Swipe',
          date: new Date(Date.now() - 1 * 86400000).toISOString()
        }
      ]
    },
    {
      id: uuidv4(),
      invoiceNumber: 'ELEC-20260830-0003',
      businessId,
      customerId: customersData[2].id,
      customerName: customersData[2].name,
      customerPhone: customersData[2].phone,
      customerAddress: customersData[2].address,
      customerGstin: customersData[2].gstin,
      items: [
        {
          productId: hpLaptop.id,
          productName: hpLaptop.name,
          sku: hpLaptop.sku,
          quantity: 2,
          unitPrice: hpLaptop.price,
          discount: 0,
          taxRate: 18,
          total: hpLaptop.price * 2
        }
      ],
      subtotal: 105067.80,
      discountTotal: 0,
      taxTotal: 18912.20,
      taxRate: 18,
      taxMode: 'EXCLUSIVE',
      grandTotal: 123980,
      amountPaid: 123980,
      balance: 0,
      paymentMethod: 'Card',
      cashAmount: 0,
      upiAmount: 0,
      cardAmount: 123980,
      status: 'PAID',
      notes: 'B2B GST Tax Invoice issued to TechCorp Solutions.',
      date: new Date().toISOString(),
      dueDate: null,
      paymentHistory: [
        {
          id: uuidv4(),
          amount: 123980,
          method: 'Bank',
          notes: 'Received via NEFT / Corporate Card',
          date: new Date().toISOString()
        }
      ]
    },
    {
      id: uuidv4(),
      invoiceNumber: 'ELEC-20260830-0004',
      businessId,
      customerId: customersData[3].id,
      customerName: customersData[3].name,
      customerPhone: customersData[3].phone,
      customerAddress: customersData[3].address,
      customerGstin: customersData[3].gstin,
      items: [
        {
          productId: jblSpeaker.id,
          productName: jblSpeaker.name,
          sku: jblSpeaker.sku,
          quantity: 1,
          unitPrice: jblSpeaker.price,
          discount: 0,
          taxRate: 18,
          total: jblSpeaker.price
        },
        {
          productId: boatEarbuds.id,
          productName: boatEarbuds.name,
          sku: boatEarbuds.sku,
          quantity: 1,
          unitPrice: boatEarbuds.price,
          discount: 0,
          taxRate: 18,
          total: boatEarbuds.price
        }
      ],
      subtotal: 9744.92,
      discountTotal: 0,
      taxTotal: 1753.08,
      taxRate: 18,
      taxMode: 'EXCLUSIVE',
      grandTotal: 11498,
      amountPaid: 11498,
      balance: 0,
      paymentMethod: 'Cash',
      cashAmount: 11498,
      upiAmount: 0,
      cardAmount: 0,
      status: 'PAID',
      notes: 'Counter Cash Sale.',
      date: new Date().toISOString(),
      dueDate: null,
      paymentHistory: [
        {
          id: uuidv4(),
          amount: 11498,
          method: 'Cash',
          notes: 'Received Cash at POS counter',
          date: new Date().toISOString()
        }
      ]
    }
  ];

  db.set('invoices', invoicesData).write();
  for (const inv of invoicesData) syncInvoice(inv);
  console.log(`✅ Seeded ${invoicesData.length} Sample Invoices.`);

  // 6. Expenses
  const expensesData = [
    {
      id: uuidv4(),
      businessId,
      title: 'Showroom Monthly Rent (Kandivali East)',
      category: 'Rent & Lease',
      amount: 45000,
      paymentMode: 'BANK_TRANSFER',
      date: new Date().toISOString().slice(0, 10),
      receiptNo: 'RENT-AUG-2026',
      notes: 'Monthly showroom lease payment to landlord'
    },
    {
      id: uuidv4(),
      businessId,
      title: 'Electricity & AC Utility Bill',
      category: 'Electricity & Utilities',
      amount: 7850,
      paymentMode: 'UPI',
      date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
      receiptNo: 'ADANI-ELE-99812',
      notes: 'Adani Electricity bill for showroom AC & lighting'
    },
    {
      id: uuidv4(),
      businessId,
      title: 'Sales Team Salaries (2 Store Staff)',
      category: 'Salaries & Wages',
      amount: 36000,
      paymentMode: 'BANK_TRANSFER',
      date: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10),
      receiptNo: 'SAL-AUG-01',
      notes: 'Monthly salaries for counter sales staff'
    },
    {
      id: uuidv4(),
      businessId,
      title: 'Branded Carry Bags & Bubble Wrap',
      category: 'Packaging Materials',
      amount: 3200,
      paymentMode: 'CASH',
      date: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10),
      receiptNo: 'PKG-8821',
      notes: '500 Pcs branded heavy carry bags for laptops and gadgets'
    },
    {
      id: uuidv4(),
      businessId,
      title: 'Customer Refreshments & Pantry',
      category: 'Tea & Refreshments',
      amount: 1450,
      paymentMode: 'CASH',
      date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
      receiptNo: 'TEA-441',
      notes: 'Coffee, tea & water bottles for showroom clients'
    }
  ];

  db.set('expenses', expensesData).write();
  for (const exp of expensesData) syncExpense(exp);
  console.log(`✅ Seeded ${expensesData.length} Sample Expenses.`);

  // 7. Purchase Orders
  const poData = [
    {
      id: uuidv4(),
      poNumber: 'PO-20260820-0001',
      businessId,
      supplierId: suppliersData[0].id,
      supplierName: suppliersData[0].name,
      supplierPhone: suppliersData[0].phone,
      items: [
        {
          productId: productsData[5].id,
          productName: productsData[5].name,
          quantity: 3,
          unitCost: productsData[5].costPrice,
          totalCost: productsData[5].costPrice * 3
        },
        {
          productId: productsData[6].id,
          productName: productsData[6].name,
          quantity: 4,
          unitCost: productsData[6].costPrice,
          totalCost: productsData[6].costPrice * 4
        }
      ],
      grandTotal: 248000,
      totalAmount: 248000,
      amountPaid: 248000,
      balance: 0,
      balancePayable: 0,
      paymentMode: 'BANK_TRANSFER',
      status: 'RECEIVED',
      notes: 'Initial Stock Order for Sony & Samsung 4K Smart TVs',
      date: new Date(Date.now() - 10 * 86400000).toISOString()
    }
  ];

  db.set('purchases', poData).write();
  db.set('purchase_orders', poData).write();
  for (const po of poData) syncPurchase(po);
  console.log(`✅ Seeded ${poData.length} Purchase Order.`);

  // 8. Stock Logs
  const stockLogsData = [
    {
      id: uuidv4(),
      businessId,
      productId: iphone.id,
      productName: iphone.name,
      type: 'SALE',
      quantity: -1,
      previousQuantity: 9,
      newQuantity: 8,
      reason: 'Invoice #ELEC-20260828-0001',
      date: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      productId: macbook.id,
      productName: macbook.name,
      type: 'SALE',
      quantity: -1,
      previousQuantity: 5,
      newQuantity: 4,
      reason: 'Invoice #ELEC-20260829-0002',
      date: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      productId: hpLaptop.id,
      productName: hpLaptop.name,
      type: 'SALE',
      quantity: -2,
      previousQuantity: 7,
      newQuantity: 5,
      reason: 'Invoice #ELEC-20260830-0003',
      date: new Date().toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      productId: jblSpeaker.id,
      productName: jblSpeaker.name,
      type: 'SALE',
      quantity: -1,
      previousQuantity: 11,
      newQuantity: 10,
      reason: 'Invoice #ELEC-20260830-0004',
      date: new Date().toISOString()
    }
  ];

  db.set('stockLogs', stockLogsData).write();
  for (const log of stockLogsData) syncStockLog(log);
  console.log(`✅ Seeded ${stockLogsData.length} Stock Logs.`);

  // 9. SMS Logs
  const smsLogsData = [
    {
      id: uuidv4(),
      businessId,
      phone: customersData[0].phone,
      customerName: customersData[0].name,
      message: `Dear Rahul Sharma, thank you for purchasing Apple iPhone 15 at Aatman Electronics. Bill Total: ₹70,498 (PAID via UPI). Have a great day!`,
      status: 'SENT',
      provider: 'simulator',
      date: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      phone: customersData[1].phone,
      customerName: customersData[1].name,
      message: `Dear Pooja Mehta, your bill #ELEC-20260829-0002 for ₹94,990 is generated. Paid: ₹85,000, Balance Due: ₹9,990. Due Date: 5th. Thank you!`,
      status: 'SENT',
      provider: 'simulator',
      date: new Date(Date.now() - 1 * 86400000).toISOString()
    }
  ];

  db.set('sms_logs', smsLogsData).write();
  for (const s of smsLogsData) syncSMSLog(s);
  console.log(`✅ Seeded ${smsLogsData.length} SMS Logs.`);

  await syncAllFromLowDB();
  console.log('\n🎉 ALL ELECTRONICS SAMPLE DATA SEEDED & SYNCHRONIZED TO MYSQL SUCCESSFULLY!');
}

seedElectronicsStore().catch(console.error);
