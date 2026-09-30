import { useEffect, useState, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Download,
  Printer,
  MessageSquare,
  IndianRupee,
  Receipt,
  History,
  CheckCircle,
  Clock,
  AlertCircle,
  UserPlus,
  Eye,
  Filter,
  RefreshCw,
  Sparkles,
  ArrowRight,
  CreditCard
} from 'lucide-react';
import api from '../api';
import { downloadInvoicePDF, printInvoicePDF, printThermalReceipt, formatCurrency } from '../utils/pdfGenerator';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import SMSModal from '../components/SMSModal';
import PaymentModal from '../components/PaymentModal';
import ReceiptPromptModal from '../components/ReceiptPromptModal';
import RecordPaymentModal from '../components/RecordPaymentModal';

export default function Sales() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'history' ? 'history' : 'pos';

  const handleSwitchTab = (tabName) => {
    if (tabName === 'history') {
      setSearchParams({ tab: 'history' });
    } else {
      setSearchParams({});
    }
  };

  // Master Data
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [businessProfile, setBusinessProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successBanner, setSuccessBanner] = useState(null);

  // POS State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [cart, setCart] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [discountType, setDiscountType] = useState('flat'); // 'flat' or 'percent'
  const [discountVal, setDiscountVal] = useState('');
  const [taxRate, setTaxRate] = useState('0'); // 0, 5, 12, 18, 28
  const [taxMode, setTaxMode] = useState('inclusive'); // 'inclusive' (MRP Standard) | 'exclusive' (Add on top)
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaidInput, setAmountPaidInput] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Quick Customer Creation Modal inside POS
  const [showQuickCustModal, setShowQuickCustModal] = useState(false);
  const [quickCustForm, setQuickCustForm] = useState({ name: '', phone: '', address: '', email: '' });
  const [quickCustLoading, setQuickCustLoading] = useState(false);

  // History Filter State
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState('ALL');
  const [historyDateRange, setHistoryDateRange] = useState('ALL'); // ALL, TODAY, 7DAYS, 30DAYS

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [smsModalState, setSmsModalState] = useState({ isOpen: false, customer: null, invoice: null });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [receiptPromptModal, setReceiptPromptModal] = useState({ isOpen: false, invoice: null });
  const [recordPaymentModal, setRecordPaymentModal] = useState({ isOpen: false, invoice: null });

  const currency = businessProfile.currency || '₹';

  // Load all master data
  const loadMasterData = async () => {
    setLoading(true);
    try {
      const [custRes, prodRes, invRes, bizRes] = await Promise.all([
        api.get('/customers'),
        api.get('/products'),
        api.get('/sales/invoices'),
        api.get('/business/profile')
      ]);
      setCustomers(custRes.data || []);
      setProducts(prodRes.data || []);
      setInvoices(invRes.data || []);
      setBusinessProfile(bizRes.data || {});
      if (bizRes.data?.invoiceNotes) {
        setInvoiceNotes(bizRes.data.invoiceNotes);
      }
    } catch (err) {
      setError('Could not load billing & inventory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  // Distinct product categories
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered products for POS catalog
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch =
        !productSearch ||
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, productSearch]);

  // Add Product to Cart
  const handleAddToCart = (product) => {
    if (product.quantity <= 0) {
      alert(`"${product.name}" is currently out of stock!`);
      return;
    }

    const existingIndex = cart.findIndex((item) => item.productId === product.id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= product.quantity) {
        alert(`Cannot add more than ${product.quantity} units (available stock).`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku || '',
          unitPrice: Number(product.price),
          quantity: 1,
          maxStock: product.quantity,
          discount: 0,
          total: Number(product.price)
        }
      ]);
    }
  };

  const handleUpdateCartQty = (index, newQty) => {
    const qty = Number(newQty);
    if (qty <= 0) return;
    const item = cart[index];
    if (qty > item.maxStock) {
      alert(`Only ${item.maxStock} units of "${item.productName}" available in stock.`);
      return;
    }
    const updated = [...cart];
    updated[index].quantity = qty;
    updated[index].total = qty * updated[index].unitPrice;
    setCart(updated);
  };

  const handleUpdateCartPrice = (index, newPrice) => {
    const price = Number(newPrice);
    const updated = [...cart];
    updated[index].unitPrice = price;
    updated[index].total = updated[index].quantity * price;
    setCart(updated);
  };

  const handleRemoveFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    if (cart.length > 0 && window.confirm('Clear all items from current bill?')) {
      setCart([]);
      setDiscountVal('');
      setAmountPaidInput('');
    }
  };

  // Financial calculations
  const rawCartTotal = useMemo(() => {
    return cart.reduce((sum, it) => sum + (Number(it.total) || 0), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    const num = Number(discountVal) || 0;
    if (num <= 0) return 0;
    if (discountType === 'percent') {
      return (rawCartTotal * num) / 100;
    }
    return Math.min(num, rawCartTotal);
  }, [rawCartTotal, discountVal, discountType]);

  const postDiscountTotal = Math.max(0, rawCartTotal - discountAmount);
  const rateNum = Number(taxRate) || 0;

  const { subtotal, taxAmount, grandTotal } = useMemo(() => {
    if (taxMode === 'inclusive' && rateNum > 0) {
      // Selling price is inclusive of GST: Grand Total = postDiscountTotal
      const gTotal = postDiscountTotal;
      const baseSub = parseFloat((postDiscountTotal / (1 + rateNum / 100)).toFixed(2));
      const tax = parseFloat((gTotal - baseSub).toFixed(2));
      return { subtotal: baseSub, taxAmount: tax, grandTotal: gTotal };
    } else {
      // Selling price is exclusive of GST: GST added on top
      const baseSub = postDiscountTotal;
      const tax = parseFloat(((postDiscountTotal * rateNum) / 100).toFixed(2));
      const gTotal = parseFloat((baseSub + tax).toFixed(2));
      return { subtotal: baseSub, taxAmount: tax, grandTotal: gTotal };
    }
  }, [postDiscountTotal, rateNum, taxMode]);

  // Set full paid by default when grand total updates if user didn't enter custom
  const effectiveAmountPaid = amountPaidInput === '' ? grandTotal : Number(amountPaidInput);
  const balanceDue = Math.max(0, grandTotal - (Number(amountPaidInput) || 0));

  // Quick Customer Creation
  const handleQuickCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!quickCustForm.name || !quickCustForm.phone) return;
    setQuickCustLoading(true);
    try {
      const res = await api.post('/customers', quickCustForm);
      setCustomers([...customers, res.data]);
      setSelectedCustomerId(res.data.id);
      setShowQuickCustModal(false);
      setQuickCustForm({ name: '', phone: '', address: '', email: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add customer.');
    } finally {
      setQuickCustLoading(false);
    }
  };

  // Open Payment Gateway Modal
  const handleOpenPaymentGateway = () => {
    if (cart.length === 0) {
      alert('Please add at least one product to the cart.');
      return;
    }
    setShowPaymentModal(true);
  };

  // Submit Invoice / Sale
  const handleConfirmPaymentFromModal = async (paymentDetails = {}) => {
    if (cart.length === 0) return;

    setSubmitting(true);
    setError('');
    setSuccessBanner(null);

    const selectedCust = customers.find((c) => c.id === selectedCustomerId);

    const payload = {
      customerId: selectedCustomerId || 'WALK_IN',
      customerName: selectedCust ? selectedCust.name : (walkInName.trim() || 'Walk-in Customer'),
      customerPhone: selectedCust ? selectedCust.phone : (walkInPhone.trim() || ''),
      customerAddress: selectedCust ? selectedCust.address : '',
      customerGstin: selectedCust ? selectedCust.gstin : '',
      items: cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        taxRate: Number(taxRate) || 0,
        total: item.total
      })),
      subtotal,
      discountTotal: discountAmount,
      taxTotal: taxAmount,
      taxRate: Number(taxRate) || 0,
      taxMode,
      grandTotal,
      amountPaid: paymentDetails.amountPaid !== undefined ? paymentDetails.amountPaid : (amountPaidInput === '' ? grandTotal : Number(amountPaidInput)),
      cashAmount: paymentDetails.cashAmount || 0,
      upiAmount: paymentDetails.upiAmount || 0,
      cardAmount: paymentDetails.cardAmount || 0,
      paymentMethod: paymentDetails.paymentMethod || paymentMethod,
      notes: paymentDetails.notes || invoiceNotes
    };

    try {
      const res = await api.post('/sales/invoice', payload);
      const createdInvoice = res.data;

      // Refresh master data (stock and invoices)
      loadMasterData();

      // Clear cart & close payment gateway
      setCart([]);
      setDiscountVal('');
      setAmountPaidInput('');
      setSelectedCustomerId('');
      setWalkInName('');
      setWalkInPhone('');
      setShowPaymentModal(false);

      setSuccessBanner({
        invoice: createdInvoice,
        message: `Invoice #${createdInvoice.invoiceNumber} recorded successfully!`
      });

      // Prompt for Receipt Option (Thermal / PDF / SMS / None)
      setReceiptPromptModal({
        isOpen: true,
        invoice: createdInvoice
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = (actionAfter = 'thermal') => {
    handleOpenPaymentGateway();
  };

  // Filtered History Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Status filter
      if (historyStatus !== 'ALL') {
        const invStatus = inv.status || (inv.balance <= 0 ? 'PAID' : 'UNPAID');
        if (invStatus.toUpperCase() !== historyStatus.toUpperCase()) return false;
      }

      // Date Range filter
      if (historyDateRange !== 'ALL' && inv.date) {
        const invDate = new Date(inv.date);
        const now = new Date();
        if (historyDateRange === 'TODAY') {
          if (invDate.toDateString() !== now.toDateString()) return false;
        } else if (historyDateRange === '7DAYS') {
          const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
          if (invDate < sevenDaysAgo) return false;
        } else if (historyDateRange === '30DAYS') {
          const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
          if (invDate < thirtyDaysAgo) return false;
        }
      }

      // Search filter
      if (historySearch) {
        const s = historySearch.toLowerCase();
        const matchesNo = inv.invoiceNumber?.toLowerCase().includes(s);
        const matchesName = inv.customerName?.toLowerCase().includes(s);
        const matchesPhone = inv.customerPhone?.includes(s);
        return matchesNo || matchesName || matchesPhone;
      }

      return true;
    });
  }, [invoices, historyStatus, historyDateRange, historySearch]);

  // History Statistics
  const historyStats = useMemo(() => {
    const totalBilled = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.amountPaid) || 0), 0);
    const totalPending = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);
    return { count: filteredInvoices.length, totalBilled, totalPaid, totalPending };
  }, [filteredInvoices]);

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Delete this invoice and restore its stock to inventory?')) return;
    try {
      await api.delete(`/sales/invoice/${invoiceId}`);
      loadMasterData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete invoice.');
    }
  };

  return (
    <div className="page pos-page">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h2>Billing & Point of Sale (POS)</h2>
          <p className="page-subtitle">Create multi-item bills, generate instant PDF receipts, and view selling history</p>
        </div>

        <div className="tab-navigation-header">
          <button
            className={`tab-pill ${activeTab === 'pos' ? 'active' : ''}`}
            onClick={() => handleSwitchTab('pos')}
          >
            <ShoppingCart size={16} /> New Bill (POS)
          </button>
          <button
            className={`tab-pill ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => handleSwitchTab('history')}
          >
            <History size={16} /> Selling History ({invoices.length})
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="alert alert-success billing-success-banner">
          <div className="flex-align-gap">
            <CheckCircle size={20} />
            <div>
              <strong>{successBanner.message}</strong>
              <div className="small-text">
                Grand Total: {currency}{successBanner.invoice.grandTotal.toLocaleString('en-IN')} • Paid: {currency}{successBanner.invoice.amountPaid.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
          <div className="banner-actions">
            <button
              className="btn btn-small btn-outline-white"
              onClick={() => downloadInvoicePDF(successBanner.invoice, businessProfile)}
            >
              <Download size={13} /> Re-download PDF
            </button>
            <button
              className="btn btn-small btn-outline-white"
              onClick={() => printInvoicePDF(successBanner.invoice, businessProfile)}
            >
              <Printer size={13} /> Print
            </button>
            <button
              className="btn btn-small btn-outline-white"
              onClick={() => printThermalReceipt(successBanner.invoice, businessProfile)}
            >
              <Receipt size={13} /> Thermal Receipt
            </button>
            <button
              className="btn btn-small btn-sms-light"
              onClick={() =>
                setSmsModalState({
                  isOpen: true,
                  customer: {
                    id: successBanner.invoice.customerId,
                    name: successBanner.invoice.customerName,
                    phone: successBanner.invoice.customerPhone,
                    totalBalance: successBanner.invoice.balance
                  },
                  invoice: successBanner.invoice
                })
              }
            >
              <MessageSquare size={13} /> 1-Click SMS
            </button>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {/* TAB 1: POINT OF SALE (POS) BILLING WORKSPACE */}
      {activeTab === 'pos' && (
        <div className="pos-layout">
          {/* Left Column: Product Selection & Catalog */}
          <div className="pos-catalog-panel">
            {/* Customer Selection Card */}
            <div className="pos-customer-card">
              <div className="card-title-row">
                <span className="card-section-title">👤 Customer Information</span>
                <button
                  type="button"
                  className="btn btn-small btn-outline"
                  onClick={() => setShowQuickCustModal(true)}
                >
                  <UserPlus size={13} /> Quick Add Customer
                </button>
              </div>

              <div className="pos-cust-row">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    if (e.target.value) {
                      setWalkInName('');
                      setWalkInPhone('');
                    }
                  }}
                  className="pos-cust-select"
                >
                  <option value="">-- Walk-in / Unregistered Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) {c.totalBalance > 0 ? `• Due: ${currency}${c.totalBalance}` : ''}
                    </option>
                  ))}
                </select>

                {!selectedCustomerId && (
                  <div className="walk-in-inputs">
                    <input
                      type="text"
                      placeholder="Customer Name (Optional)"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Phone Number (for SMS receipt)"
                      value={walkInPhone}
                      onChange={(e) => setWalkInPhone(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Product Search & Category Filters */}
            <div className="pos-filter-bar">
              <div className="search-wrap">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search products by name or SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="pos-category-pills">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="pos-products-grid">
              {filteredProducts.length === 0 ? (
                <div className="empty-catalog-box">
                  <p className="muted">No matching products found in stock.</p>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.quantity <= (p.lowStockThreshold || 5);
                  const isOut = p.quantity <= 0;
                  return (
                    <div
                      key={p.id}
                      className={`product-card-pos ${isOut ? 'out-of-stock' : ''}`}
                      onClick={() => !isOut && handleAddToCart(p)}
                    >
                      <div className="product-card-header">
                        <span className="product-category-tag">{p.category || 'General'}</span>
                        <span className={`stock-badge ${isOut ? 'stock-out' : isLow ? 'stock-low' : 'stock-ok'}`}>
                          {p.quantity} {p.unit || 'pcs'}
                        </span>
                      </div>
                      <div className="product-card-name" title={p.name}>
                        {p.name}
                      </div>
                      <div className="product-card-sku">SKU: {p.sku || '-'}</div>
                      <div className="product-card-footer">
                        <span className="product-card-price">{formatCurrency(p.price, currency)}</span>
                        <button
                          type="button"
                          className="btn-add-cart"
                          disabled={isOut}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(p);
                          }}
                        >
                          <Plus size={14} /> Add
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Billing Cart & Checkout Terminal */}
          <div className="pos-cart-panel" id="pos-cart-section">
            <div className="pos-cart-header">
              <div className="flex-align-gap">
                <ShoppingCart size={18} />
                <h3>Current Bill</h3>
                <span className="cart-item-count">{cart.length} items</span>
              </div>
              {cart.length > 0 && (
                <button className="btn-clear-cart" onClick={handleClearCart}>
                  Clear
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="pos-cart-items">
              {cart.length === 0 ? (
                <div className="cart-empty-placeholder">
                  <ShoppingCart size={36} className="empty-cart-icon" />
                  <p>Your cart is empty</p>
                  <span>Click products from the catalog on the left to add items to this bill</span>
                </div>
              ) : (
                <div className="cart-items-table-wrap">
                  <table className="cart-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, index) => (
                        <tr key={item.productId || index}>
                          <td className="cart-item-info">
                            <div className="cart-item-name">{item.productName}</div>
                            <div className="cart-item-sku">{item.sku}</div>
                          </td>
                          <td>
                            <div className="qty-control">
                              <button
                                type="button"
                                className="qty-btn"
                                onClick={() => handleUpdateCartQty(index, item.quantity - 1)}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={item.maxStock}
                                value={item.quantity}
                                onChange={(e) => handleUpdateCartQty(index, e.target.value)}
                                className="qty-input"
                              />
                              <button
                                type="button"
                                className="qty-btn"
                                onClick={() => handleUpdateCartQty(index, item.quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateCartPrice(index, e.target.value)}
                              className="cart-price-input"
                            />
                          </td>
                          <td className="cart-item-total">{formatCurrency(item.total, currency)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-trash-item"
                              onClick={() => handleRemoveFromCart(index)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bill Summary & Payment Section */}
            <div className="pos-summary-section">
              {/* Discount & Tax Row */}
              <div className="summary-input-row">
                <div className="input-with-label">
                  <label>Discount</label>
                  <div className="discount-input-group">
                    <input
                      type="number"
                      placeholder="0"
                      value={discountVal}
                      onChange={(e) => setDiscountVal(e.target.value)}
                    />
                    <button
                      type="button"
                      className="discount-toggle-btn"
                      onClick={() => setDiscountType(discountType === 'flat' ? 'percent' : 'flat')}
                    >
                      {discountType === 'flat' ? currency : '%'}
                    </button>
                  </div>
                </div>

                <div className="input-with-label">
                  <label>Tax / GST Rate</label>
                  <select value={taxRate} onChange={(e) => setTaxRate(e.target.value)}>
                    <option value="0">0% (None / Exempt)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>
              </div>

              {Number(taxRate) > 0 && (
                <div className="input-with-label mt-2">
                  <label>GST Calculation Mode</label>
                  <div className="flex-align-gap" style={{ gap: '6px' }}>
                    <button
                      type="button"
                      className={`btn btn-small ${taxMode === 'inclusive' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setTaxMode('inclusive')}
                      title="Item prices already include GST (MRP Standard)"
                    >
                      Inclusive of GST (MRP)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-small ${taxMode === 'exclusive' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setTaxMode('exclusive')}
                      title="Add GST on top of item prices"
                    >
                      Exclusive (Add on top)
                    </button>
                  </div>
                </div>
              )}

              {/* Summary Calculations */}
              <div className="summary-lines">
                {taxMode === 'inclusive' && Number(taxRate) > 0 ? (
                  <>
                    <div className="summary-line">
                      <span>Gross Total (MRP)</span>
                      <span>{formatCurrency(rawCartTotal, currency)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="summary-line text-success">
                        <span>Discount ({discountType === 'percent' ? `${discountVal}%` : 'Flat'})</span>
                        <span>-{formatCurrency(discountAmount, currency)}</span>
                      </div>
                    )}
                    <div className="summary-line text-secondary">
                      <span>Taxable Subtotal (Base)</span>
                      <span>{formatCurrency(subtotal, currency)}</span>
                    </div>
                    <div className="summary-line text-secondary">
                      <span>GST ({taxRate}% Included)</span>
                      <span>{formatCurrency(taxAmount, currency)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="summary-line">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal, currency)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="summary-line text-success">
                        <span>Discount ({discountType === 'percent' ? `${discountVal}%` : 'Flat'})</span>
                        <span>-{formatCurrency(discountAmount, currency)}</span>
                      </div>
                    )}
                    {taxAmount > 0 && (
                      <div className="summary-line">
                        <span>Tax / GST ({taxRate}%)</span>
                        <span>+{formatCurrency(taxAmount, currency)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="summary-line summary-grand-total">
                  <span>Grand Total</span>
                  <span>{formatCurrency(grandTotal, currency)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="pos-payment-inputs">
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="Cash">💵 Cash</option>
                    <option value="UPI">📱 UPI / QR Code</option>
                    <option value="Card">💳 Credit / Debit Card</option>
                    <option value="Bank Transfer">🏦 Bank Transfer</option>
                    <option value="Cheque">📄 Cheque</option>
                    <option value="Credit/Due">⏳ Credit / Pay Later</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount Paid Now ({currency})</label>
                  <input
                    type="number"
                    placeholder={`Full (${currency}${grandTotal.toLocaleString('en-IN')})`}
                    value={amountPaidInput}
                    onChange={(e) => setAmountPaidInput(e.target.value)}
                  />
                </div>
              </div>

              {balanceDue > 0 && (
                <div className="balance-due-pill">
                  <span>Pending Balance:</span>
                  <strong>{formatCurrency(balanceDue, currency)}</strong>
                </div>
              )}

              {/* Primary Collect Payment Button */}
              <div className="pos-action-primary mt-3">
                <button
                  type="button"
                  className="btn-pos-primary-pay"
                  disabled={submitting || cart.length === 0}
                  onClick={handleOpenPaymentGateway}
                  style={{ width: '100%', padding: '14px', fontSize: '1.02rem', fontWeight: 800 }}
                  title="Open live payment gateway"
                >
                  <CreditCard size={18} />
                  <span>{submitting ? 'Processing Bill...' : `Collect Payment (${formatCurrency(grandTotal, currency)})`}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Floating Bar for small screens / laptops */}
          {cart.length > 0 && (
            <div
              className="mobile-cart-floating-bar"
              onClick={() => {
                document.getElementById('pos-cart-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <div className="flex-align-gap">
                <ShoppingCart size={18} />
                <span>
                  <strong>{cart.length} item{cart.length > 1 ? 's' : ''} in Bill</strong> • {formatCurrency(grandTotal, currency)}
                </span>
              </div>
              <span className="btn-floating-checkout">Checkout ➔</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SELLING HISTORY & INVOICE LEDGER */}
      {activeTab === 'history' && (
        <div className="history-section">
          {/* History KPI Cards */}
          <div className="stat-grid mb-4">
            <div className="stat-card">
              <div className="stat-icon stat-icon-primary"><Receipt size={18} /></div>
              <div>
                <div className="stat-label">Total Invoices Filtered</div>
                <div className="stat-value">{historyStats.count}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-primary"><IndianRupee size={18} /></div>
              <div>
                <div className="stat-label">Total Billed Amount</div>
                <div className="stat-value">{formatCurrency(historyStats.totalBilled, currency)}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-primary"><CheckCircle size={18} /></div>
              <div>
                <div className="stat-label">Total Revenue Collected</div>
                <div className="stat-value">{formatCurrency(historyStats.totalPaid, currency)}</div>
              </div>
            </div>

            <div className="stat-card stat-warning">
              <div className="stat-icon stat-icon-warning"><Clock size={18} /></div>
              <div>
                <div className="stat-label">Total Balance Due</div>
                <div className="stat-value">{formatCurrency(historyStats.totalPending, currency)}</div>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="toolbar">
            <div className="search-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by Invoice #, Customer Name, Phone..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-group">
              <select value={historyStatus} onChange={(e) => setHistoryStatus(e.target.value)}>
                <option value="ALL">All Payment Statuses</option>
                <option value="PAID">PAID</option>
                <option value="PARTIAL">PARTIAL</option>
                <option value="UNPAID">UNPAID</option>
              </select>

              <select value={historyDateRange} onChange={(e) => setHistoryDateRange(e.target.value)}>
                <option value="ALL">All Time</option>
                <option value="TODAY">Today Only</option>
                <option value="7DAYS">Last 7 Days</option>
                <option value="30DAYS">Last 30 Days</option>
              </select>

              <button className="btn btn-outline" onClick={loadMasterData} title="Refresh selling records">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {/* Invoices Data Table */}
          {loading ? (
            <p>Loading selling history...</p>
          ) : filteredInvoices.length === 0 ? (
            <div className="empty-state-card">
              <p className="muted">No sales invoices match your search filters.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th className="text-right">Grand Total</th>
                    <th className="text-right">Paid</th>
                    <th className="text-right">Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => {
                    const status = inv.status || (inv.balance <= 0 ? 'PAID' : 'UNPAID');
                    const itemsSummary = (inv.items || [])
                      .map((it) => `${it.productName} (x${it.quantity})`)
                      .join(', ');

                    return (
                      <tr key={inv.id}>
                        <td>
                          <button
                            type="button"
                            className="link-invoice-btn"
                            onClick={() => setSelectedInvoice(inv)}
                          >
                            #{inv.invoiceNumber || inv.id.slice(0, 8)}
                          </button>
                        </td>
                        <td>{new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td>
                          <div><strong>{inv.customerName}</strong></div>
                          {inv.customerPhone && <div className="small-text muted">{inv.customerPhone}</div>}
                        </td>
                        <td className="items-summary-cell" title={itemsSummary}>
                          {itemsSummary.length > 35 ? `${itemsSummary.slice(0, 35)}...` : itemsSummary || '1 item'}
                        </td>
                        <td className="text-right font-bold">{formatCurrency(inv.grandTotal, currency)}</td>
                        <td className="text-right text-success">{formatCurrency(inv.amountPaid, currency)}</td>
                        <td className="text-right">
                          {inv.balance > 0 ? (
                            <span className="text-danger font-bold">{formatCurrency(inv.balance, currency)}</span>
                          ) : (
                            <span className="text-success">{currency}0.00</span>
                          )}
                        </td>
                        <td>
                          {status === 'PAID' && <span className="badge badge-success">PAID</span>}
                          {status === 'PARTIAL' && <span className="badge badge-warning">PARTIAL</span>}
                          {status === 'UNPAID' && <span className="badge badge-danger">UNPAID</span>}
                        </td>
                        <td className="actions-cell">
                          {inv.balance > 0 && (
                            <button
                              type="button"
                              className="btn btn-small"
                              style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0', fontWeight: 700 }}
                              onClick={() => setRecordPaymentModal({ isOpen: true, invoice: inv })}
                              title="Record inward payment towards this invoice"
                            >
                              <IndianRupee size={12} /> Collect Due
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-small"
                            onClick={() => setSelectedInvoice(inv)}
                            title="View Full Bill & Payments"
                          >
                            <Eye size={13} /> View
                          </button>

                          <button
                            type="button"
                            className="btn btn-small btn-primary"
                            onClick={() => downloadInvoicePDF(inv, businessProfile)}
                            title="Download PDF Bill"
                          >
                            <Download size={13} /> PDF
                          </button>

                          <button
                            type="button"
                            className="btn btn-small btn-sms"
                            onClick={() =>
                              setSmsModalState({
                                isOpen: true,
                                customer: {
                                  id: inv.customerId,
                                  name: inv.customerName,
                                  phone: inv.customerPhone,
                                  totalBalance: inv.balance
                                },
                                invoice: inv
                              })
                            }
                            title="Send 1-Click SMS"
                          >
                            <MessageSquare size={13} /> SMS
                          </button>

                          <button
                            type="button"
                            className="btn btn-small btn-danger"
                            onClick={() => handleDeleteInvoice(inv.id)}
                            title="Delete / Cancel Invoice"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showQuickCustModal && (
        <div className="modal-backdrop" onClick={() => setShowQuickCustModal(false)}>
          <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Quick Add Customer</h3>
              <button className="modal-close-btn" onClick={() => setShowQuickCustModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleQuickCustomerSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={quickCustForm.name}
                    onChange={(e) => setQuickCustForm({ ...quickCustForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number (10 digits) *</label>
                  <input
                    type="text"
                    required
                    value={quickCustForm.phone}
                    onChange={(e) => setQuickCustForm({ ...quickCustForm, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address (Optional)</label>
                  <input
                    type="text"
                    value={quickCustForm.address}
                    onChange={(e) => setQuickCustForm({ ...quickCustForm, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowQuickCustModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={quickCustLoading}>
                  {quickCustLoading ? 'Saving...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        business={businessProfile}
        onInvoiceUpdated={(updatedInv) => {
          setSelectedInvoice(updatedInv);
          loadMasterData();
        }}
        onOpenSMS={(cust, inv) => {
          setSmsModalState({
            isOpen: true,
            customer: cust,
            invoice: inv
          });
        }}
      />

      {/* 1-Click SMS Modal */}
      <SMSModal
        isOpen={smsModalState.isOpen}
        onClose={() => setSmsModalState({ isOpen: false, customer: null, invoice: null })}
        customer={smsModalState.customer}
        invoice={smsModalState.invoice}
        business={businessProfile}
      />

      {/* POS Payment Gateway Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        cart={cart}
        customer={{
          name: (customers.find((c) => c.id === selectedCustomerId)?.name) || walkInName.trim() || 'Walk-in Customer',
          phone: (customers.find((c) => c.id === selectedCustomerId)?.phone) || walkInPhone.trim() || ''
        }}
        summary={{
          subtotal,
          discountTotal: discountAmount,
          taxTotal: taxAmount,
          taxRate: Number(taxRate) || 0,
          taxMode,
          grandTotal
        }}
        business={businessProfile}
        paymentMethod={paymentMethod}
        onConfirmCheckout={handleConfirmPaymentFromModal}
        submitting={submitting}
      />

      {/* Post-Payment Receipt Selection Modal */}
      <ReceiptPromptModal
        isOpen={receiptPromptModal.isOpen}
        onClose={() => setReceiptPromptModal({ isOpen: false, invoice: null })}
        invoice={receiptPromptModal.invoice}
        business={businessProfile}
        onOpenSmsModal={(inv) => {
          setSmsModalState({
            isOpen: true,
            customer: {
              id: inv.customerId,
              name: inv.customerName,
              phone: inv.customerPhone,
              totalBalance: inv.balance
            },
            invoice: inv
          });
        }}
      />

      {/* Record Invoice Balance Payment Modal */}
      <RecordPaymentModal
        isOpen={recordPaymentModal.isOpen}
        onClose={() => setRecordPaymentModal({ isOpen: false, invoice: null })}
        invoice={recordPaymentModal.invoice}
        business={businessProfile}
        onSuccess={() => {
          loadMasterData();
        }}
      />
    </div>
  );
}
