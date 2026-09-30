const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const {
  initMySQL,
  syncAllFromLowDB
} = require('./mysql_sync');

async function seedOneMonthData() {
  console.log('🚀 Generating 1-Month (30 Days) Realistic Dataset for Smart Electronics...');

  // 1. Get or setup Business Profile
  let biz = db.get('businesses').value()[0];
  if (!biz) {
    console.error('No business profile found. Please register or seed initial profile.');
    return;
  }
  const businessId = biz.id;

  // 2. Suppliers
  const suppliersData = [
    {
      id: uuidv4(),
      businessId,
      name: 'Apex Electronics Distributors Pvt Ltd',
      contactPerson: 'Suresh Singhania',
      phone: '9820011223',
      email: 'sales@apexelectronics.in',
      address: 'Plot 42, MIDC Industrial Area, Andheri East, Mumbai - 400093',
      gstin: '27AABCA1234F1Z5',
      category: 'Smart TVs and Home Appliances',
      paymentTerms: '30 Days Net',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'BrightTech Mobile and IT Supply Co.',
      contactPerson: 'Manish Chawla',
      phone: '9819922334',
      email: 'orders@brighttechsupply.com',
      address: 'Shop 108, Lamington Road, Grant Road, Mumbai - 400007',
      gstin: '27AABCB5678G1Z2',
      category: 'Smartphones and Laptops',
      paymentTerms: '15 Days Net',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Sonic Audio and Accessories Hub',
      contactPerson: 'Karan Mehra',
      phone: '9870033445',
      email: 'supply@sonicaudio.in',
      address: '2nd Floor, Electronics Market, Fort, Mumbai - 400001',
      gstin: '27AABCC9012H1Z9',
      category: 'Audio, Cables and Storage',
      paymentTerms: 'Immediate / Cash Discount',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
    }
  ];

  db.set('suppliers', suppliersData).write();

  // 3. Products Catalog (15 Realistic Electronics Products)
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
      quantity: 14,
      lowStockThreshold: 4,
      batchNo: 'APL-2026-08',
      expiryDate: '',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
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
      quantity: 10,
      lowStockThreshold: 3,
      batchNo: 'SAM-2026-Q3',
      expiryDate: '',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
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
      quantity: 18,
      lowStockThreshold: 5,
      batchNo: 'OP-2026-B1',
      expiryDate: '',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Apple MacBook Air M2 (8GB RAM, 256GB SSD, Space Grey)',
      sku: 'MBA-M2-8-256-GRY',
      category: 'Laptops and Computers',
      unit: 'pcs',
      costPrice: 84000,
      price: 94990,
      quantity: 7,
      lowStockThreshold: 2,
      batchNo: 'MBA-2026-M2',
      expiryDate: '',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'HP Pavilion 15 (Core i5 13th Gen, 16GB, 512GB SSD)',
      sku: 'HP-PAV-15-I5',
      category: 'Laptops and Computers',
      unit: 'pcs',
      costPrice: 54000,
      price: 61990,
      quantity: 9,
      lowStockThreshold: 3,
      batchNo: 'HP-2026-15G',
      expiryDate: '',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Sony Bravia 55" 4K Google TV (KD-55X74L)',
      sku: 'SNY-TV-55-4K',
      category: 'Smart TVs and Display',
      unit: 'pcs',
      costPrice: 48000,
      price: 57990,
      quantity: 6,
      lowStockThreshold: 2,
      batchNo: 'SNY-2026-74L',
      expiryDate: '',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Samsung 43" Crystal 4K UHD Smart TV (43CUE60)',
      sku: 'SAM-TV-43-4K',
      category: 'Smart TVs and Display',
      unit: 'pcs',
      costPrice: 26000,
      price: 31990,
      quantity: 11,
      lowStockThreshold: 3,
      batchNo: 'SAM-2026-43C',
      expiryDate: '',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Sony WH-1000XM5 Wireless Noise-Cancelling Headphones',
      sku: 'SNY-XM5-BLK',
      category: 'Audio and Sound',
      unit: 'pcs',
      costPrice: 24000,
      price: 29990,
      quantity: 8,
      lowStockThreshold: 2,
      batchNo: 'SNY-XM5-01',
      expiryDate: '',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'JBL Flip 6 Portable Waterproof Bluetooth Speaker',
      sku: 'JBL-FLIP-6-BLK',
      category: 'Audio and Sound',
      unit: 'pcs',
      costPrice: 8000,
      price: 9999,
      quantity: 16,
      lowStockThreshold: 4,
      batchNo: 'JBL-2026-FL6',
      expiryDate: '',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'boAt Airdopes 141 Bluetooth TWS Earbuds (42H Playtime)',
      sku: 'BOAT-AD-141-BLK',
      category: 'Audio and Sound',
      unit: 'pcs',
      costPrice: 900,
      price: 1499,
      quantity: 35,
      lowStockThreshold: 10,
      batchNo: 'BT-2026-141',
      expiryDate: '',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Anker 65W GaN Fast Wall Charger (3-Port USB-C and A)',
      sku: 'ANK-65W-GAN',
      category: 'Cables and Chargers',
      unit: 'pcs',
      costPrice: 2400,
      price: 3499,
      quantity: 24,
      lowStockThreshold: 5,
      batchNo: 'ANK-65W-01',
      expiryDate: '',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'boAt Type-C to Type-C 65W Braided Fast Cable (1.5m)',
      sku: 'BOAT-CC-65W',
      category: 'Cables and Chargers',
      unit: 'pcs',
      costPrice: 250,
      price: 499,
      quantity: 50,
      lowStockThreshold: 15,
      batchNo: 'BT-CC-2026',
      expiryDate: '',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'SanDisk 128GB Ultra Dual Type-C OTG Flash Drive',
      sku: 'SD-128G-OTG',
      category: 'Storage and IT',
      unit: 'pcs',
      costPrice: 950,
      price: 1399,
      quantity: 40,
      lowStockThreshold: 10,
      batchNo: 'SD-128G-B3',
      expiryDate: '',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
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
      quantity: 5,
      lowStockThreshold: 2,
      batchNo: 'LG-2026-REF',
      expiryDate: '',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
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
      quantity: 20,
      lowStockThreshold: 5,
      batchNo: 'HAV-2026-STM',
      expiryDate: '',
      createdAt: new Date(Date.now() - 32 * 86400000).toISOString()
    }
  ];

  db.set('products', productsData).write();

  // 4. Customers (10 Realistic Customers)
  const customersData = [
    {
      id: uuidv4(),
      businessId,
      name: 'Rahul Sharma',
      phone: '9820112233',
      email: 'rahul.sharma@gmail.com',
      address: 'Flat 402, Sea View Tower, Andheri West, Mumbai',
      gstin: '',
      notes: 'VIP Customer - Prefers Apple accessories',
      totalBalance: 0,
      createdAt: new Date(Date.now() - 29 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Pooja Mehta',
      phone: '9892334455',
      email: 'pooja.mehta92@yahoo.com',
      address: 'B-12, Green Acres, Borivali West, Mumbai',
      gstin: '',
      notes: 'Regular customer',
      totalBalance: 0,
      createdAt: new Date(Date.now() - 27 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Vikram Singhania (TechCorp Solutions)',
      phone: '9821445566',
      email: 'accounts@techcorpsolutions.com',
      address: 'Unit 501, Tech Park, Mindspace, Malad West, Mumbai',
      gstin: '27AABCT8899A1Z4',
      notes: 'Corporate Account (B2B GST Invoicing)',
      totalBalance: 0,
      createdAt: new Date(Date.now() - 25 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Sneha Patel',
      phone: '9876554433',
      email: 'sneha.p@outlook.com',
      address: '14, Mahavir Nagar, Kandivali West, Mumbai',
      gstin: '',
      notes: 'Walk-in buyer',
      totalBalance: 0,
      createdAt: new Date(Date.now() - 22 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Amit Joshi',
      phone: '9820887766',
      email: 'amit.joshi@gmail.com',
      address: 'B-404, Gokul Horizon, Thakur Village, Kandivali East, Mumbai',
      gstin: '',
      notes: 'Audio and Gadgets enthusiast',
      totalBalance: 0,
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Priya Kapoor',
      phone: '9833441122',
      email: 'priya.kapoor@hotmail.com',
      address: 'Flat 1002, Raheja Heights, Malad East, Mumbai',
      gstin: '',
      notes: 'Bought Smart TV with extended warranty',
      totalBalance: 0,
      createdAt: new Date(Date.now() - 18 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Rajesh Deshmukh',
      phone: '9819001144',
      email: 'rajesh.deshmukh@gmail.com',
      address: 'Shop 3, Station Road, Goregaon West, Mumbai',
      gstin: '27AAEPD4455C1Z8',
      notes: 'B2B Retail Partner',
      totalBalance: 0,
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Kavita Nair',
      phone: '9867552211',
      email: 'kavita.nair@gmail.com',
      address: '502, Palm Beach Residency, Vashi, Navi Mumbai',
      gstin: '',
      notes: 'Home appliances buyer',
      totalBalance: 0,
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Siddharth Jain',
      phone: '9820667788',
      email: 'sid.jain@gmail.com',
      address: 'A-201, Oberoi Splendor, JVLR, Andheri East, Mumbai',
      gstin: '',
      notes: 'Gaming and High-end Computing buyer',
      totalBalance: 0,
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      name: 'Walk-in Counter Customer',
      phone: '9999999999',
      email: '',
      address: 'Counter Sale, Kandivali East',
      gstin: '',
      notes: 'Direct OTC Cash / QR Sales',
      totalBalance: 0,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    }
  ];

  db.set('customers', customersData).write();

  // Helper to create Invoices
  function makeInvoice(seq, daysAgo, custIndex, itemsConfig, paymentMethod, discount = 0, taxRate = 18) {
    const cust = customersData[custIndex];
    const invoiceDate = new Date(Date.now() - daysAgo * 86400000);
    const dateStr = invoiceDate.toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNumber = `ELEC-${dateStr}-${String(seq).padStart(4, '0')}`;

    let subtotal = 0;
    const items = itemsConfig.map((cfg) => {
      const prod = productsData[cfg.prodIndex];
      const qty = cfg.qty || 1;
      const unitPrice = cfg.unitPrice || prod.price;
      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;
      return {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        quantity: qty,
        unitPrice,
        discount: 0,
        taxRate,
        total: lineTotal
      };
    });

    const discountTotal = discount;
    const grandTotal = Math.round(subtotal - discountTotal);
    const amountPaid = grandTotal;
    const balance = 0;

    let cashAmount = 0, upiAmount = 0, cardAmount = 0;
    if (paymentMethod === 'Cash') cashAmount = grandTotal;
    else if (paymentMethod === 'UPI') upiAmount = grandTotal;
    else if (paymentMethod === 'Card') cardAmount = grandTotal;

    return {
      id: uuidv4(),
      invoiceNumber,
      businessId,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      customerAddress: cust.address,
      customerGstin: cust.gstin,
      items,
      subtotal: Math.round((grandTotal / (1 + taxRate / 100)) * 100) / 100,
      discountTotal,
      taxTotal: Math.round((grandTotal - (grandTotal / (1 + taxRate / 100))) * 100) / 100,
      taxRate,
      taxMode: 'INCLUSIVE',
      grandTotal,
      amountPaid,
      balance,
      paymentMethod,
      cashAmount,
      upiAmount,
      cardAmount,
      status: 'PAID',
      notes: 'Thank you for shopping with Smart Electronics!',
      date: invoiceDate.toISOString(),
      dueDate: null,
      paymentHistory: [
        {
          id: uuidv4(),
          amount: grandTotal,
          method: paymentMethod,
          notes: `Paid in full via ${paymentMethod}`,
          date: invoiceDate.toISOString()
        }
      ]
    };
  }

  // 5. 22 Invoices distributed across the 30-Day Month
  const invoicesData = [
    // Week 1 (Days 29 to 23 ago)
    makeInvoice(1, 29, 0, [{ prodIndex: 0, qty: 1 }, { prodIndex: 11, qty: 1 }], 'UPI'),
    makeInvoice(2, 28, 1, [{ prodIndex: 8, qty: 1 }, { prodIndex: 9, qty: 1 }], 'Cash'),
    makeInvoice(3, 27, 4, [{ prodIndex: 7, qty: 1 }, { prodIndex: 12, qty: 2 }], 'UPI'),
    makeInvoice(4, 25, 2, [{ prodIndex: 4, qty: 2 }, { prodIndex: 10, qty: 2 }], 'Bank Transfer'),
    makeInvoice(5, 23, 9, [{ prodIndex: 10, qty: 1 }, { prodIndex: 11, qty: 2 }, { prodIndex: 12, qty: 1 }], 'UPI'),

    // Week 2 (Days 22 to 16 ago)
    makeInvoice(6, 22, 5, [{ prodIndex: 5, qty: 1 }], 'Card'),
    makeInvoice(7, 20, 3, [{ prodIndex: 2, qty: 1 }, { prodIndex: 10, qty: 1 }], 'UPI'),
    makeInvoice(8, 19, 7, [{ prodIndex: 13, qty: 1 }, { prodIndex: 14, qty: 1 }], 'Card'),
    makeInvoice(9, 17, 8, [{ prodIndex: 3, qty: 1 }, { prodIndex: 10, qty: 1 }], 'Card'),
    makeInvoice(10, 16, 9, [{ prodIndex: 9, qty: 3 }, { prodIndex: 11, qty: 3 }], 'Cash'),

    // Week 3 (Days 15 to 9 ago)
    makeInvoice(11, 15, 6, [{ prodIndex: 1, qty: 1 }, { prodIndex: 7, qty: 1 }], 'UPI'),
    makeInvoice(12, 14, 0, [{ prodIndex: 10, qty: 2 }, { prodIndex: 12, qty: 3 }], 'UPI'),
    makeInvoice(13, 12, 2, [{ prodIndex: 3, qty: 1 }, { prodIndex: 4, qty: 1 }], 'Bank Transfer'),
    makeInvoice(14, 11, 4, [{ prodIndex: 6, qty: 1 }, { prodIndex: 8, qty: 1 }], 'UPI'),
    makeInvoice(15, 10, 9, [{ prodIndex: 2, qty: 1 }, { prodIndex: 9, qty: 1 }], 'Cash'),
    makeInvoice(16, 9, 1, [{ prodIndex: 0, qty: 1 }], 'Card'),

    // Week 4 (Days 8 to 1 ago)
    makeInvoice(17, 8, 3, [{ prodIndex: 14, qty: 2 }, { prodIndex: 10, qty: 1 }], 'UPI'),
    makeInvoice(18, 6, 5, [{ prodIndex: 6, qty: 1 }, { prodIndex: 7, qty: 1 }], 'Card'),
    makeInvoice(19, 5, 8, [{ prodIndex: 4, qty: 1 }, { prodIndex: 12, qty: 2 }], 'UPI'),
    makeInvoice(20, 3, 9, [{ prodIndex: 8, qty: 2 }, { prodIndex: 9, qty: 4 }], 'Cash'),
    makeInvoice(21, 2, 0, [{ prodIndex: 1, qty: 1 }, { prodIndex: 11, qty: 2 }], 'UPI'),
    makeInvoice(22, 1, 7, [{ prodIndex: 5, qty: 1 }, { prodIndex: 13, qty: 1 }], 'Card')
  ];

  db.set('invoices', invoicesData).write();

  // 6. Monthly Operating Expenses (Spread across 30 days)
  const expensesData = [
    {
      id: uuidv4(),
      businessId,
      title: 'Commercial Showroom Rent (August 2026)',
      category: 'Rent',
      amount: 45000,
      paymentMode: 'Bank Transfer',
      date: new Date(Date.now() - 28 * 86400000).toISOString(),
      receiptNo: 'RENT-AUG-01',
      notes: 'Paid to Galaxy Arcade Landlord via NEFT'
    },
    {
      id: uuidv4(),
      businessId,
      title: 'Store Staff & Counter Sales Salaries (3 Employees)',
      category: 'Salaries',
      amount: 36000,
      paymentMode: 'Bank Transfer',
      date: new Date(Date.now() - 24 * 86400000).toISOString(),
      receiptNo: 'SAL-2026-08',
      notes: 'Monthly payroll for 2 Sales Execs + 1 Technician'
    },
    {
      id: uuidv4(),
      businessId,
      title: 'Commercial Electricity & AC Utility Bill',
      category: 'Utilities',
      amount: 7850,
      paymentMode: 'UPI',
      date: new Date(Date.now() - 19 * 86400000).toISOString(),
      receiptNo: 'MSEDCL-202608',
      notes: 'Adani Electricity Power Bill'
    },
    {
      id: uuidv4(),
      businessId,
      title: 'Premium Carry Bags & Protective Bubble Packaging',
      category: 'Marketing & Supplies',
      amount: 3200,
      paymentMode: 'Cash',
      date: new Date(Date.now() - 14 * 86400000).toISOString(),
      receiptNo: 'PKG-2026-44',
      notes: 'Branded Smart Electronics shopping bags & billing rolls'
    },
    {
      id: uuidv4(),
      businessId,
      title: 'High-Speed Fiber Broadband & Cloud POS Terminal',
      category: 'Software & Internet',
      amount: 1999,
      paymentMode: 'UPI',
      date: new Date(Date.now() - 10 * 86400000).toISOString(),
      receiptNo: 'JIO-FIB-08',
      notes: '300 Mbps Static IP Fiber Connection'
    },
    {
      id: uuidv4(),
      businessId,
      title: 'Showroom Client Pantry, Tea & Drinking Water Cans',
      category: 'Office & Pantry',
      amount: 1450,
      paymentMode: 'Cash',
      date: new Date(Date.now() - 4 * 86400000).toISOString(),
      receiptNo: 'PANTRY-AUG',
      notes: 'Bisleri water cans + Nescafe & tea for visitors'
    }
  ];

  db.set('expenses', expensesData).write();

  // 7. Purchase Orders & Stock Replenishment Logs
  const poData = [
    {
      id: uuidv4(),
      poNumber: 'PO-20260805-0001',
      businessId,
      supplierId: suppliersData[1].id,
      supplierName: suppliersData[1].name,
      supplierPhone: suppliersData[1].phone,
      items: [
        {
          productId: productsData[0].id,
          productName: productsData[0].name,
          quantity: 10,
          unitCost: productsData[0].costPrice,
          totalCost: productsData[0].costPrice * 10
        },
        {
          productId: productsData[3].id,
          productName: productsData[3].name,
          quantity: 5,
          unitCost: productsData[3].costPrice,
          totalCost: productsData[3].costPrice * 5
        }
      ],
      grandTotal: 1040000,
      totalAmount: 1040000,
      amountPaid: 1040000,
      balance: 0,
      balancePayable: 0,
      paymentMode: 'BANK_TRANSFER',
      status: 'RECEIVED',
      notes: 'Monthly Stock replenishment for Apple iPhones and MacBooks',
      date: new Date(Date.now() - 26 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      poNumber: 'PO-20260815-0002',
      businessId,
      supplierId: suppliersData[0].id,
      supplierName: suppliersData[0].name,
      supplierPhone: suppliersData[0].phone,
      items: [
        {
          productId: productsData[5].id,
          productName: productsData[5].name,
          quantity: 5,
          unitCost: productsData[5].costPrice,
          totalCost: productsData[5].costPrice * 5
        },
        {
          productId: productsData[6].id,
          productName: productsData[6].name,
          quantity: 8,
          unitCost: productsData[6].costPrice,
          totalCost: productsData[6].costPrice * 8
        }
      ],
      grandTotal: 448000,
      totalAmount: 448000,
      amountPaid: 448000,
      balance: 0,
      balancePayable: 0,
      paymentMode: 'BANK_TRANSFER',
      status: 'RECEIVED',
      notes: 'Sony and Samsung 4K Smart TVs Delivery',
      date: new Date(Date.now() - 16 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      poNumber: 'PO-20260822-0003',
      businessId,
      supplierId: suppliersData[2].id,
      supplierName: suppliersData[2].name,
      supplierPhone: suppliersData[2].phone,
      items: [
        {
          productId: productsData[8].id,
          productName: productsData[8].name,
          quantity: 15,
          unitCost: productsData[8].costPrice,
          totalCost: productsData[8].costPrice * 15
        },
        {
          productId: productsData[9].id,
          productName: productsData[9].name,
          quantity: 30,
          unitCost: productsData[9].costPrice,
          totalCost: productsData[9].costPrice * 30
        }
      ],
      grandTotal: 147000,
      totalAmount: 147000,
      amountPaid: 147000,
      balance: 0,
      balancePayable: 0,
      paymentMode: 'BANK_TRANSFER',
      status: 'RECEIVED',
      notes: 'JBL Speakers and boAt Earbuds Bulk Pack',
      date: new Date(Date.now() - 9 * 86400000).toISOString()
    }
  ];

  db.set('purchases', poData).write();
  db.set('purchase_orders', poData).write();

  // 8. Stock Logs
  const stockLogsData = [
    {
      id: uuidv4(),
      businessId,
      productId: productsData[0].id,
      productName: productsData[0].name,
      sku: productsData[0].sku,
      changeType: 'PURCHASE',
      quantityChanged: 10,
      previousQuantity: 4,
      newQuantity: 14,
      notes: 'Received from BrightTech Mobile Co.',
      date: new Date(Date.now() - 26 * 86400000).toISOString()
    },
    {
      id: uuidv4(),
      businessId,
      productId: productsData[5].id,
      productName: productsData[5].name,
      sku: productsData[5].sku,
      changeType: 'PURCHASE',
      quantityChanged: 5,
      previousQuantity: 1,
      newQuantity: 6,
      notes: 'Received from Apex Electronics',
      date: new Date(Date.now() - 16 * 86400000).toISOString()
    }
  ];

  db.set('stock_logs', stockLogsData).write();

  // 9. Sync to MySQL
  await initMySQL();
  await syncAllFromLowDB();

  console.log('\n🎉 1-MONTH DATASET SEEDED SUCCESSFULLY:');
  console.log(` - 🏪 Business: Smart Electronics`);
  console.log(` - 📦 Products Catalog: ${productsData.length} items`);
  console.log(` - 👥 Customers: ${customersData.length} active profiles`);
  console.log(` - 🧾 Invoices: ${invoicesData.length} invoices across 30 days`);
  console.log(` - 💸 Operating Expenses: ${expensesData.length} entries`);
  console.log(` - 🚚 Purchase Orders: ${poData.length} orders`);
  console.log(` - 🔄 Synchronized to phpMyAdmin MySQL (bizmanager_db) live!\n`);
}

seedOneMonthData().catch(console.error);
