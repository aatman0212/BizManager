import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  AlertCircle,
  Users,
  Package,
  PackageX,
  Receipt,
  IndianRupee,
  Calendar,
  Download,
  Eye,
  Plus,
  RefreshCcw,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { downloadInvoicePDF, formatCurrency } from '../utils/pdfGenerator';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import SMSModal from '../components/SMSModal';

export default function Dashboard() {
  const { businessName } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [businessProfile, setBusinessProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [smsModalState, setSmsModalState] = useState({ isOpen: false, customer: null, invoice: null });

  // Quick Restock Modal from Dashboard
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockQty, setRestockQty] = useState('10');
  const [restocking, setRestocking] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, bizRes] = await Promise.all([
        api.get('/sales/dashboard/stats'),
        api.get('/business/profile')
      ]);
      setStats(statsRes.data);
      setBusinessProfile(bizRes.data || {});
    } catch (err) {
      setError('Could not load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockQty || Number(restockQty) <= 0 || !restockProduct) return;
    setRestocking(true);
    try {
      await api.post(`/products/${restockProduct.id}/restock`, {
        quantity: Number(restockQty),
        notes: 'Restocked from Dashboard alert'
      });
      setRestockProduct(null);
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to restock.');
    } finally {
      setRestocking(false);
    }
  };

  if (loading) return <div className="page">Loading business analytics...</div>;
  if (error) return <div className="page alert alert-error">{error}</div>;

  const currency = businessProfile.currency || '₹';
  const maxDaily = Math.max(1, ...Object.values(stats.salesByDate || {}));
  const maxTop = Math.max(1, ...(stats.topProducts || []).map((p) => p.qty));

  return (
    <div className="page">
      {/* Welcome Header */}
      <div className="page-header">
        <div>
          <div className="welcome-tag">
            <Sparkles size={14} className="text-primary" />
            <span>BUSINESS OVERVIEW</span>
          </div>
          <h2>Welcome back, {businessProfile.businessName || businessName}</h2>
          <p className="page-subtitle">
            Here's a summary of your sales, customer receivables, and stock inventory.
          </p>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => navigate('/sales')}>
            <Plus size={16} /> New Bill (POS)
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-primary"><Wallet size={18} /></div>
          <div>
            <div className="stat-label">Total Revenue Collected</div>
            <div className="stat-value">{formatCurrency(stats.totalRevenue, currency)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-primary"><TrendingUp size={18} /></div>
          <div>
            <div className="stat-label">Today's Sales Revenue</div>
            <div className="stat-value">{formatCurrency(stats.todayRevenue, currency)}</div>
          </div>
        </div>

        <div className={`stat-card ${stats.totalPending > 0 ? 'stat-warning' : ''}`}>
          <div className={`stat-icon ${stats.totalPending > 0 ? 'stat-icon-warning' : 'stat-icon-primary'}`}>
            <AlertCircle size={18} />
          </div>
          <div>
            <div className="stat-label">Total Pending Receivables</div>
            <div className="stat-value">{formatCurrency(stats.totalPending, currency)}</div>
          </div>
        </div>

        <div className={`stat-card ${stats.lowStockCount > 0 ? 'stat-danger' : ''}`}>
          <div className={`stat-icon ${stats.lowStockCount > 0 ? 'stat-icon-danger' : 'stat-icon-primary'}`}>
            <PackageX size={18} />
          </div>
          <div>
            <div className="stat-label">Low Stock Alerts</div>
            <div className="stat-value">{stats.lowStockCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-primary"><Users size={18} /></div>
          <div>
            <div className="stat-label">Total Customers</div>
            <div className="stat-value">{stats.totalCustomers}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-primary"><Receipt size={18} /></div>
          <div>
            <div className="stat-label">Total Invoices Billed</div>
            <div className="stat-value">{stats.totalInvoices || stats.totalSales}</div>
          </div>
        </div>
      </div>

      {/* Actionable Low Stock Center */}
      {stats.lowStockProducts && stats.lowStockProducts.length > 0 && (
        <div className="dashboard-section-card alert-section mt-4">
          <div className="dashboard-section-header">
            <div className="flex-align-gap">
              <AlertTriangle size={18} className="text-danger" />
              <h3>Critical Low Stock Items ({stats.lowStockProducts.length})</h3>
            </div>
            <button
              type="button"
              className="link-btn-text"
              onClick={() => navigate('/products')}
            >
              View Full Inventory <ArrowRight size={14} />
            </button>
          </div>

          <div className="table-responsive mt-2">
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th className="text-center">Current Stock</th>
                  <th className="text-center">Alert Limit</th>
                  <th>Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.lowStockProducts.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td><span className="product-category-tag">{p.category || 'General'}</span></td>
                    <td>{formatCurrency(p.price, currency)}</td>
                    <td className="text-center">
                      <span className={`badge ${p.quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>
                        {p.quantity === 0 ? 'OUT OF STOCK (0)' : `${p.quantity} left`}
                      </span>
                    </td>
                    <td className="text-center muted">{p.lowStockThreshold || 5} units</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-small btn-secondary"
                        onClick={() => {
                          setRestockProduct(p);
                          setRestockQty('10');
                        }}
                      >
                        <RefreshCcw size={12} /> + Restock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts & Analytics Row */}
      <div className="charts-row mt-4">
        {/* Sales by Date */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>📈 Sales Revenue Trends</h3>
            <span className="small-text muted">Daily billing volume</span>
          </div>

          {!stats.salesByDate || Object.keys(stats.salesByDate).length === 0 ? (
            <div className="empty-chart-placeholder">
              <p className="muted">No sales recorded yet.</p>
            </div>
          ) : (
            <div className="bar-chart">
              {Object.entries(stats.salesByDate)
                .sort(([a], [b]) => new Date(a) - new Date(b))
                .slice(-10)
                .map(([date, amount]) => (
                  <div className="bar-row" key={date}>
                    <span className="bar-label">
                      {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${(amount / maxDaily) * 100}%` }}
                      />
                    </div>
                    <span className="bar-value">{formatCurrency(amount, currency)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>🏆 Top Selling Products</h3>
            <span className="small-text muted">By quantity sold</span>
          </div>

          {!stats.topProducts || stats.topProducts.length === 0 ? (
            <div className="empty-chart-placeholder">
              <p className="muted">No product sales yet.</p>
            </div>
          ) : (
            <div className="bar-chart">
              {stats.topProducts.map((p) => (
                <div className="bar-row" key={p.name}>
                  <span className="bar-label" title={p.name}>
                    {p.name.length > 18 ? `${p.name.slice(0, 18)}...` : p.name}
                  </span>
                  <div className="bar-track">
                    <div
                      className="bar-fill bar-fill-alt"
                      style={{ width: `${(p.qty / maxTop) * 100}%` }}
                    />
                  </div>
                  <span className="bar-value">{p.qty} units</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Invoices Ledger */}
      <div className="dashboard-section-card mt-4">
        <div className="dashboard-section-header">
          <div className="flex-align-gap">
            <Receipt size={18} />
            <h3>Recent Sales & Invoices</h3>
          </div>
          <button
            type="button"
            className="link-btn-text"
            onClick={() => navigate('/sales?tab=history')}
          >
            View All Invoices <ArrowRight size={14} />
          </button>
        </div>

        {!stats.recentInvoices || stats.recentInvoices.length === 0 ? (
          <p className="muted mt-3">No invoices generated yet.</p>
        ) : (
          <div className="table-responsive mt-3">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th className="text-right">Grand Total</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right">Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentInvoices.map((inv) => (
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
                    <td>{new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                    <td><strong>{inv.customerName}</strong></td>
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
                      {inv.balance <= 0 ? (
                        <span className="badge badge-success">PAID</span>
                      ) : (
                        <span className="badge badge-warning">PARTIAL</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      <button
                        type="button"
                        className="btn btn-small"
                        onClick={() => setSelectedInvoice(inv)}
                        title="View Details"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-small btn-primary"
                        onClick={() => downloadInvoicePDF(inv, businessProfile)}
                        title="Download PDF Bill"
                      >
                        <Download size={13} /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        business={businessProfile}
        onInvoiceUpdated={() => loadDashboardData()}
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

      {/* Quick Restock Modal */}
      {restockProduct && (
        <div className="modal-backdrop" onClick={() => setRestockProduct(null)}>
          <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Restock: {restockProduct.name}</h3>
              <button className="modal-close-btn" onClick={() => setRestockProduct(null)}>✕</button>
            </div>
            <form onSubmit={handleRestockSubmit}>
              <div className="modal-body">
                <p className="modal-subtitle mb-3">
                  Current Stock: <strong>{restockProduct.quantity} {restockProduct.unit || 'pcs'}</strong>
                </p>
                <div className="form-group">
                  <label className="form-label">Units to Add *</label>
                  <input
                    type="number"
                    min="1"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setRestockProduct(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={restocking}>
                  {restocking ? 'Adding...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
