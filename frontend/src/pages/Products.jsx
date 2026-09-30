import { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  X,
  RefreshCcw,
  Trash2,
  Check,
  Search,
  AlertTriangle,
  Package,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Layers,
  IndianRupee,
  Pencil
} from 'lucide-react';
import api from '../api';
import { formatCurrency } from '../utils/pdfGenerator';

const emptyForm = {
  name: '',
  sku: '',
  category: '',
  unit: 'pcs',
  costPrice: '',
  price: '',
  quantity: '',
  lowStockThreshold: '5',
  batchNo: '',
  expiryDate: ''
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [stockLogs, setStockLogs] = useState([]);
  const [businessProfile, setBusinessProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'logs'

  // Restock Modal
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockSupplier, setRestockSupplier] = useState('');
  const [restockNotes, setRestockNotes] = useState('');
  const [restocking, setRestocking] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currency = businessProfile.currency || '₹';

  const loadProductsAndLogs = async () => {
    setLoading(true);
    try {
      const [prodRes, logsRes, bizRes] = await Promise.all([
        api.get('/products'),
        api.get('/products/stock-logs'),
        api.get('/business/profile')
      ]);
      setProducts(prodRes.data || []);
      setStockLogs(logsRes.data || []);
      setBusinessProfile(bizRes.data || {});
    } catch (err) {
      setError('Could not load inventory records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductsAndLogs();
  }, []);

  // Category list
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Low stock products
  const lowStockItems = useMemo(() => {
    return products.filter((p) => Number(p.quantity) <= Number(p.lowStockThreshold || 5));
  }, [products]);

  // Total inventory valuation
  const inventoryStats = useMemo(() => {
    const totalQty = products.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
    const totalValue = products.reduce((sum, p) => sum + (Number(p.quantity || 0) * Number(p.price || 0)), 0);
    const lowCount = lowStockItems.length;
    const outCount = products.filter((p) => Number(p.quantity) === 0).length;
    return { totalQty, totalValue, lowCount, outCount };
  }, [products, lowStockItems]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (lowStockOnly && Number(p.quantity) > Number(p.lowStockThreshold || 5)) {
        return false;
      }
      if (selectedCategory !== 'All' && p.category !== selectedCategory) {
        return false;
      }
      if (search) {
        const s = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(s);
        const matchesSku = p.sku && p.sku.toLowerCase().includes(s);
        const matchesCat = p.category && p.category.toLowerCase().includes(s);
        return matchesName || matchesSku || matchesCat;
      }
      return true;
    });
  }, [products, lowStockOnly, selectedCategory, search]);

  const openAddForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (prod) => {
    setForm({
      name: prod.name,
      sku: prod.sku || '',
      category: prod.category || '',
      unit: prod.unit || 'pcs',
      costPrice: prod.costPrice !== undefined ? String(prod.costPrice) : '',
      price: String(prod.price),
      quantity: String(prod.quantity),
      lowStockThreshold: String(prod.lowStockThreshold || 5)
    });
    setEditingId(prod.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, form);
        setSuccessMsg(`Product "${form.name}" updated successfully!`);
      } else {
        await api.post('/products', form);
        setSuccessMsg(`Product "${form.name}" added to inventory!`);
      }
      setShowForm(false);
      setForm(emptyForm);
      loadProductsAndLogs();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    }
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockQty || Number(restockQty) <= 0 || !restockProduct) return;
    setRestocking(true);
    setError('');

    try {
      await api.post(`/products/${restockProduct.id}/restock`, {
        quantity: Number(restockQty),
        supplier: restockSupplier,
        notes: restockNotes
      });
      setRestockProduct(null);
      setRestockQty('');
      setRestockSupplier('');
      setRestockNotes('');
      setSuccessMsg(`Restocked +${restockQty} units of ${restockProduct.name}!`);
      loadProductsAndLogs();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restock product.');
    } finally {
      setRestocking(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}" from inventory?`)) return;
    try {
      await api.delete(`/products/${id}`);
      loadProductsAndLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete product.');
    }
  };

  return (
    <div className="page">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h2>Stock & Inventory Management</h2>
          <p className="page-subtitle">Track real-time stock levels, receive low stock alerts, and manage product catalog</p>
        </div>
        <div className="flex-align-gap">
          <button className="btn btn-primary" onClick={openAddForm}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Inventory KPI Summary Cards */}
      <div className="stat-grid mb-4">
        <div className="stat-card">
          <div className="stat-icon stat-icon-primary"><Package size={18} /></div>
          <div>
            <div className="stat-label">Total Unique Products</div>
            <div className="stat-value">{products.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-primary"><Layers size={18} /></div>
          <div>
            <div className="stat-label">Total Units in Stock</div>
            <div className="stat-value">{inventoryStats.totalQty.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-primary"><IndianRupee size={18} /></div>
          <div>
            <div className="stat-label">Total Stock Retail Value</div>
            <div className="stat-value">{formatCurrency(inventoryStats.totalValue, currency)}</div>
          </div>
        </div>

        <div className={`stat-card ${inventoryStats.lowCount > 0 ? 'stat-danger' : ''}`}>
          <div className={`stat-icon ${inventoryStats.lowCount > 0 ? 'stat-icon-danger' : 'stat-icon-primary'}`}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="stat-label">Low / Out of Stock Items</div>
            <div className="stat-value">{inventoryStats.lowCount}</div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="alert alert-warning low-stock-alert-banner">
          <div className="flex-align-gap">
            <AlertTriangle size={20} className="warning-icon" />
            <div>
              <strong>Low Stock Alert: {lowStockItems.length} {lowStockItems.length === 1 ? 'product needs' : 'products need'} replenishment!</strong>
              <div className="low-stock-preview-list">
                {lowStockItems.slice(0, 4).map((p) => (
                  <span key={p.id} className="low-stock-item-pill">
                    {p.name}: <strong>{p.quantity} left</strong> (Alert level: {p.lowStockThreshold})
                  </span>
                ))}
                {lowStockItems.length > 4 && <span>+{lowStockItems.length - 4} more</span>}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-small btn-warning-dark"
            onClick={() => setLowStockOnly(true)}
          >
            Filter Low Stock Items
          </button>
        </div>
      )}

      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Tabs */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Package size={16} /> Inventory Catalog ({products.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <Clock size={16} /> Stock Movement Logs ({stockLogs.length})
        </button>
      </div>

      {activeTab === 'inventory' && (
        <>
          {/* Toolbar */}
          <div className="toolbar">
            <div className="search-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by product name, SKU, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-group">
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
                ))}
              </select>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                />
                Show Low Stock Only
              </label>
            </div>
          </div>

          {/* New / Edit Product Form Drawer/Inline */}
          {showForm && (
            <form className="inline-form" onSubmit={handleSubmit}>
              <div className="form-header-row">
                <h3>{editingId ? 'Edit Product' : 'Add New Product to Inventory'}</h3>
                <button type="button" className="btn-close-form" onClick={() => setShowForm(false)}>
                  <X size={16} />
                </button>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    placeholder="e.g. Wireless Mouse, Cotton T-Shirt"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">SKU / Item Code</label>
                  <input
                    placeholder="e.g. ELEC-MOU-1001 (Auto-generated if empty)"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    placeholder="e.g. Electronics, Clothing, Groceries"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unit of Measurement</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="box">Box (box)</option>
                    <option value="pkt">Packet (pkt)</option>
                    <option value="meter">Meters (m)</option>
                    <option value="ltr">Liters (ltr)</option>
                    <option value="pair">Pair (pair)</option>
                    <option value="set">Set (set)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Selling Price ({currency}) *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Cost / Purchase Price ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Current Stock Quantity *</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Low Stock Alert Level</label>
                  <input
                    type="number"
                    placeholder="5"
                    value={form.lowStockThreshold}
                    onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Batch / Lot Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. BATCH-2026-A"
                    value={form.batchNo || ''}
                    onChange={(e) => setForm({ ...form, batchNo: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={form.expiryDate || ''}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-actions mt-3">
                <button type="submit" className="btn btn-primary">
                  <Check size={16} /> {editingId ? 'Save Product Changes' : 'Create Product'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Products Table */}
          {loading ? (
            <p>Loading products...</p>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state-card">
              <p className="muted">No products found. Click "+ Add Product" to add items.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-center">Stock Level</th>
                    <th className="text-center">Alert Limit</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const isOut = p.quantity <= 0;
                    const isLow = p.quantity <= (p.lowStockThreshold || 5);
                    return (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.name}</strong>
                          <span className="unit-label muted"> ({p.unit || 'pcs'})</span>
                          {(p.batchNo || p.expiryDate) && (
                            <div className="customer-tag-note">
                              {p.batchNo ? `Batch: ${p.batchNo}` : ''}
                              {p.batchNo && p.expiryDate ? ' • ' : ''}
                              {p.expiryDate ? `Exp: ${new Date(p.expiryDate).toLocaleDateString('en-IN')}` : ''}
                            </div>
                          )}
                        </td>
                        <td><span className="sku-tag">{p.sku || '-'}</span></td>
                        <td><span className="product-category-tag">{p.category || 'General'}</span></td>
                        <td className="text-right font-bold">{formatCurrency(p.price, currency)}</td>
                        <td className="text-center">
                          {isOut ? (
                            <span className="badge badge-danger">OUT OF STOCK (0)</span>
                          ) : isLow ? (
                            <span className="badge badge-warning">
                              <AlertTriangle size={12} /> {p.quantity} {p.unit || 'pcs'} (LOW)
                            </span>
                          ) : (
                            <span className="badge badge-success">
                              {p.quantity} {p.unit || 'pcs'}
                            </span>
                          )}
                        </td>
                        <td className="text-center muted">{p.lowStockThreshold || 5} {p.unit || 'pcs'}</td>
                        <td className="actions-cell">
                          <button
                            type="button"
                            className="btn btn-small btn-secondary"
                            onClick={() => {
                              setRestockProduct(p);
                              setRestockQty('10');
                            }}
                            title="Restock units"
                          >
                            <RefreshCcw size={13} /> Restock
                          </button>

                          <button
                            type="button"
                            className="btn btn-small"
                            onClick={() => openEditForm(p)}
                            title="Edit product"
                          >
                            <Pencil size={13} /> Edit
                          </button>

                          <button
                            type="button"
                            className="btn btn-small btn-danger"
                            onClick={() => handleDelete(p.id, p.name)}
                            title="Delete product"
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
        </>
      )}

      {/* TAB 2: STOCK MOVEMENT LOGS */}
      {activeTab === 'logs' && (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Product</th>
                <th>Type</th>
                <th className="text-center">Quantity</th>
                <th className="text-center">Balance Stock</th>
                <th>Reason / Invoice</th>
              </tr>
            </thead>
            <tbody>
              {stockLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td><strong>{log.productName}</strong></td>
                  <td>
                    {log.type === 'SALE' && (
                      <span className="badge badge-danger">
                        <ArrowDownRight size={11} /> SALE DEDUCTION
                      </span>
                    )}
                    {log.type === 'RESTOCK' && (
                      <span className="badge badge-success">
                        <ArrowUpRight size={11} /> RESTOCK INTAKE
                      </span>
                    )}
                    {log.type === 'INITIAL' && (
                      <span className="badge badge-primary">INITIAL STOCK</span>
                    )}
                    {log.type === 'ADJUSTMENT' && (
                      <span className="badge badge-warning">MANUAL ADJUSTMENT</span>
                    )}
                    {log.type === 'RESTORE' && (
                      <span className="badge badge-success">INVOICE RESTORE</span>
                    )}
                  </td>
                  <td className={`text-center font-bold ${log.quantity < 0 ? 'text-danger' : 'text-success'}`}>
                    {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                  </td>
                  <td className="text-center">{log.newQuantity ?? '-'}</td>
                  <td className="muted">{log.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Restock Modal */}
      {restockProduct && (
        <div className="modal-backdrop" onClick={() => setRestockProduct(null)}>
          <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex-align-gap">
                <RefreshCcw size={18} className="text-primary" />
                <h3>Restock Inventory: {restockProduct.name}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setRestockProduct(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRestockSubmit}>
              <div className="modal-body">
                <p className="modal-subtitle mb-3">
                  Current Stock: <strong>{restockProduct.quantity} {restockProduct.unit || 'pcs'}</strong>
                </p>

                <div className="form-group">
                  <label className="form-label">Quantity to Add *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter units to add"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Supplier / Source (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. ABC Wholesale Distributors"
                    value={restockSupplier}
                    onChange={(e) => setRestockSupplier(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes / Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Batch #458, Received in good condition"
                    value={restockNotes}
                    onChange={(e) => setRestockNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setRestockProduct(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={restocking}>
                  <Check size={16} /> {restocking ? 'Adding Stock...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
