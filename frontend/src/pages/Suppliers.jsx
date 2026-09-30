import { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  PackagePlus,
  CheckCircle,
  AlertCircle,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
  Clock
} from 'lucide-react';
import api from '../api';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('suppliers'); // 'suppliers' | 'purchases'
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modals
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedSupplierForPay, setSelectedSupplierForPay] = useState(null);

  // New Supplier Form
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    notes: ''
  });

  // New PO Form
  const [poForm, setPoForm] = useState({
    supplierId: '',
    items: [],
    amountPaid: 0,
    paymentMode: 'CASH',
    notes: ''
  });

  // Vendor Pay Form
  const [payForm, setPayForm] = useState({
    amount: '',
    paymentMode: 'CASH',
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [supRes, poRes, prodRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/suppliers/purchases'),
        api.get('/products')
      ]);
      setSuppliers(supRes.data || []);
      setPurchases(poRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      setErrorMsg('Failed to load supplier data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) return;

    try {
      await api.post('/suppliers', supplierForm);
      setSuccessMsg('Supplier registered successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      setShowAddSupplierModal(false);
      setSupplierForm({ name: '', phone: '', email: '', address: '', gstin: '', notes: '' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create supplier.');
    }
  };

  const handleOpenPOModal = (supplierId = '') => {
    setPoForm({
      supplierId: supplierId || (suppliers[0]?.id || ''),
      items: products.length > 0 ? [{ productId: products[0].id, qty: 1, unitCost: products[0].costPrice || 0 }] : [],
      amountPaid: 0,
      paymentMode: 'CASH',
      notes: ''
    });
    setShowPOModal(true);
  };

  const handleAddItemToPO = () => {
    if (products.length === 0) return;
    setPoForm({
      ...poForm,
      items: [...poForm.items, { productId: products[0].id, qty: 1, unitCost: products[0].costPrice || 0 }]
    });
  };

  const handleRemovePOItem = (index) => {
    setPoForm({
      ...poForm,
      items: poForm.items.filter((_, idx) => idx !== index)
    });
  };

  const handleUpdatePOItem = (index, field, value) => {
    const updated = [...poForm.items];
    updated[index][field] = value;
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      if (prod) {
        updated[index].unitCost = prod.costPrice || 0;
      }
    }
    setPoForm({ ...poForm, items: updated });
  };

  const poTotalAmount = poForm.items.reduce((sum, it) => sum + (Number(it.qty) * Number(it.unitCost) || 0), 0);

  const handleSubmitPO = async (e) => {
    e.preventDefault();
    if (!poForm.supplierId) {
      alert('Please select a supplier.');
      return;
    }
    if (poForm.items.length === 0) {
      alert('Please add at least one item to restock.');
      return;
    }

    try {
      await api.post('/suppliers/purchase', poForm);
      setSuccessMsg('Purchase Order created and inventory stock replenished successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      setShowPOModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process purchase order.');
    }
  };

  const handleOpenPayModal = (supplier) => {
    setSelectedSupplierForPay(supplier);
    setPayForm({
      amount: supplier.balancePayable > 0 ? supplier.balancePayable : '',
      paymentMode: 'CASH',
      notes: ''
    });
    setShowPayModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedSupplierForPay || !payForm.amount || Number(payForm.amount) <= 0) return;

    try {
      await api.post(`/suppliers/${selectedSupplierForPay.id}/pay`, payForm);
      setSuccessMsg(`Payment recorded for ${selectedSupplierForPay.name}!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      setShowPayModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment.');
    }
  };

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return s.name?.toLowerCase().includes(q) || s.phone?.includes(q) || s.email?.toLowerCase().includes(q);
    });
  }, [suppliers, search]);

  const totalPayableAll = suppliers.reduce((sum, s) => sum + (Number(s.balancePayable) || 0), 0);
  const totalPurchasedAll = suppliers.reduce((sum, s) => sum + (Number(s.totalPurchased) || 0), 0);

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Suppliers & Purchase Orders (PO)</h2>
          <p className="page-subtitle">Manage vendors, create purchase orders, auto-restock products, and track payables</p>
        </div>

        <div className="flex-align-gap">
          <button className="btn btn-outline" onClick={() => setShowAddSupplierModal(true)}>
            <Plus size={16} /> New Supplier
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenPOModal()}>
            <PackagePlus size={16} /> Create Purchase Order (Restock)
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="alert alert-error">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-primary">
            <Truck size={22} />
          </div>
          <div>
            <div className="stat-label">Active Suppliers</div>
            <div className="stat-value">{suppliers.length} Vendors</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-primary">
            <Receipt size={22} />
          </div>
          <div>
            <div className="stat-label">Total Purchased (PO)</div>
            <div className="stat-value">₹{totalPurchasedAll.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-danger">
            <DollarSign size={22} />
          </div>
          <div>
            <div className="stat-label">Total Outstanding Payable</div>
            <div className="stat-value text-danger">₹{totalPayableAll.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-warning">
            <ShoppingCart size={22} />
          </div>
          <div>
            <div className="stat-label">Total POs Issued</div>
            <div className="stat-value">{purchases.length} Orders</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'suppliers' ? 'active' : ''}`}
          onClick={() => setActiveTab('suppliers')}
        >
          <Truck size={16} /> Supplier Directory ({suppliers.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'purchases' ? 'active' : ''}`}
          onClick={() => setActiveTab('purchases')}
        >
          <Clock size={16} /> Purchase Orders Ledger ({purchases.length})
        </button>
      </div>

      {activeTab === 'suppliers' && (
        <>
          <div className="toolbar">
            <div className="search-wrap">
              <input
                type="text"
                className="search-input"
                placeholder="Search suppliers by name, phone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Contact Info</th>
                  <th>GSTIN / Tax ID</th>
                  <th className="text-right">Total Purchased</th>
                  <th className="text-right">Balance Payable</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center">Loading suppliers...</td></tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr><td colSpan="6" className="text-center muted">No suppliers registered yet. Click "New Supplier" above to add one!</td></tr>
                ) : (
                  filteredSuppliers.map((sup) => (
                    <tr key={sup.id}>
                      <td>
                        <strong>{sup.name}</strong>
                        {sup.notes && <div className="customer-tag-note">{sup.notes}</div>}
                      </td>
                      <td>
                        <div>{sup.phone || '-'}</div>
                        {sup.email && <div className="muted small-text">{sup.email}</div>}
                      </td>
                      <td><span className="sku-tag">{sup.gstin || 'URP'}</span></td>
                      <td className="text-right font-bold">₹{Number(sup.totalPurchased || 0).toLocaleString('en-IN')}</td>
                      <td className="text-right">
                        <span className={sup.balancePayable > 0 ? 'text-danger font-bold' : 'text-success'}>
                          ₹{Number(sup.balancePayable || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="actions-cell" style={{ justifyContent: 'center' }}>
                          <button
                            className="btn btn-outline btn-small"
                            onClick={() => handleOpenPOModal(sup.id)}
                            title="Create Purchase Order for this supplier"
                          >
                            <PackagePlus size={14} /> Restock (PO)
                          </button>
                          {sup.balancePayable > 0 && (
                            <button
                              className="btn btn-primary btn-small"
                              onClick={() => handleOpenPayModal(sup)}
                              title="Record payment towards balance"
                            >
                              Pay Vendor
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'purchases' && (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Items Restocked</th>
                <th className="text-right">Total Amount</th>
                <th className="text-right">Amount Paid</th>
                <th className="text-right">Balance Due</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr><td colSpan="7" className="text-center muted">No Purchase Orders recorded yet.</td></tr>
              ) : (
                purchases.map((po) => (
                  <tr key={po.id}>
                    <td><strong>{po.purchaseNumber}</strong></td>
                    <td>{new Date(po.date).toLocaleDateString('en-IN')}</td>
                    <td>{po.supplierName}</td>
                    <td>
                      <div className="items-summary-cell" title={po.items?.map(i => `${i.productName} (x${i.qty})`).join(', ')}>
                        {po.items?.map(i => `${i.productName} (x${i.qty})`).join(', ')}
                      </div>
                    </td>
                    <td className="text-right font-bold">₹{Number(po.totalAmount).toLocaleString('en-IN')}</td>
                    <td className="text-right text-success font-bold">₹{Number(po.amountPaid).toLocaleString('en-IN')}</td>
                    <td className="text-right">
                      <span className={po.balanceDue > 0 ? 'text-danger font-bold' : 'text-success'}>
                        ₹{Number(po.balanceDue).toLocaleString('en-IN')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="modal-backdrop" onClick={() => setShowAddSupplierModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon-badge" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                  <Truck size={20} />
                </div>
                <div>
                  <h3>Register New Supplier / Vendor</h3>
                  <p className="modal-subtitle">Add supplier profile for purchase orders and inventory restocking</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddSupplierModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateSupplier}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">Supplier / Company Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. National Wholesale Distributors"
                      value={supplierForm.name}
                      onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact Mobile / Phone</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={supplierForm.phone}
                      onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      placeholder="vendor@company.com"
                      value={supplierForm.email}
                      onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">GSTIN / Tax Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      value={supplierForm.gstin}
                      onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Warehouse / Office Address</label>
                    <textarea
                      rows={2}
                      placeholder="Vendor address..."
                      value={supplierForm.address}
                      onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddSupplierModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Purchase Order Modal */}
      {showPOModal && (
        <div className="modal-backdrop" onClick={() => setShowPOModal(false)}>
          <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon-badge" style={{ background: '#ecfdf5', color: '#059669' }}>
                  <PackagePlus size={20} />
                </div>
                <div>
                  <h3>Create Purchase Order (Stock In)</h3>
                  <p className="modal-subtitle">Items ordered will be automatically added to your live product inventory</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowPOModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmitPO}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Vendor / Supplier *</label>
                  <select
                    value={poForm.supplierId}
                    onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.phone || 'No phone'})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group mt-3">
                  <div className="card-title-row">
                    <label className="form-label">Items to Order & Restock:</label>
                    <button type="button" className="btn btn-outline btn-small" onClick={handleAddItemToPO}>
                      <Plus size={14} /> Add Item Row
                    </button>
                  </div>

                  {poForm.items.map((item, idx) => (
                    <div key={idx} className="flex-align-gap mt-2" style={{ alignItems: 'flex-end' }}>
                      <div style={{ flex: 3 }}>
                        <label className="small-text muted">Product</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleUpdatePOItem(idx, 'productId', e.target.value)}
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Stock: {p.quantity})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ flex: 1 }}>
                        <label className="small-text muted">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleUpdatePOItem(idx, 'qty', e.target.value)}
                          required
                        />
                      </div>

                      <div style={{ flex: 1.5 }}>
                        <label className="small-text muted">Cost Price (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitCost}
                          onChange={(e) => handleUpdatePOItem(idx, 'unitCost', e.target.value)}
                          required
                        />
                      </div>

                      <div style={{ flex: 1, textAlign: 'right', fontWeight: 'bold' }}>
                        <label className="small-text muted d-block">Total</label>
                        ₹{(Number(item.qty) * Number(item.unitCost) || 0).toLocaleString('en-IN')}
                      </div>

                      {poForm.items.length > 1 && (
                        <button
                          type="button"
                          className="btn-trash-item"
                          onClick={() => handleRemovePOItem(idx)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="invoice-summary-container mt-3">
                  <div className="invoice-summary-box">
                    <div className="summary-row font-bold">
                      <span>Total PO Amount:</span>
                      <span>₹{poTotalAmount.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="form-group mt-2">
                      <label className="form-label small-text">Amount Paid to Vendor Now (₹):</label>
                      <input
                        type="number"
                        min="0"
                        max={poTotalAmount}
                        step="any"
                        value={poForm.amountPaid}
                        onChange={(e) => setPoForm({ ...poForm, amountPaid: e.target.value })}
                      />
                    </div>

                    <div className="summary-row summary-balance-row">
                      <span>Balance Payable:</span>
                      <span className="text-danger font-bold">
                        ₹{Math.max(0, poTotalAmount - (Number(poForm.amountPaid) || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowPOModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm PO & Restock Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Vendor Modal */}
      {showPayModal && selectedSupplierForPay && (
        <div className="modal-backdrop" onClick={() => setShowPayModal(false)}>
          <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon-badge" style={{ background: '#ecfdf5', color: '#059669' }}>
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3>Record Vendor Payment</h3>
                  <p className="modal-subtitle">For <strong>{selectedSupplierForPay.name}</strong></p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowPayModal(false)}>×</button>
            </div>

            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                <div className="sms-customer-chip">
                  <div><strong>Total Balance Due:</strong></div>
                  <div className="text-danger font-bold">₹{selectedSupplierForPay.balancePayable?.toLocaleString('en-IN')}</div>
                </div>

                <div className="form-group mt-3">
                  <label className="form-label">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedSupplierForPay.balancePayable}
                    step="any"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <select
                    value={payForm.paymentMode}
                    onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value })}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowPayModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
