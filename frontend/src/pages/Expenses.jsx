import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Filter,
  Calendar,
  Tag,
  TrendingDown,
  Receipt,
  CheckCircle,
  AlertCircle,
  PieChart,
  Wallet
} from 'lucide-react';
import api from '../api';

const EXPENSE_CATEGORIES = [
  'Rent & Lease',
  'Salaries & Wages',
  'Electricity & Utilities',
  'Shipping & Logistics',
  'Shop Maintenance',
  'Tea & Refreshments',
  'Packaging Materials',
  'Marketing & Ads',
  'Taxes & Legal',
  'Miscellaneous'
];

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({ totalExpense: 0, thisMonthExpense: 0, categoryBreakdown: [] });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS'
  const [search, setSearch] = useState('');

  // New Expense Form State
  const [form, setForm] = useState({
    title: '',
    category: 'Rent & Lease',
    amount: '',
    paymentMode: 'CASH',
    date: new Date().toISOString().slice(0, 10),
    receiptNo: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const [expRes, statsRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/expenses/stats')
      ]);
      setExpenses(expRes.data || []);
      setStats(statsRes.data || {});
    } catch (err) {
      setError('Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount || Number(form.amount) <= 0) {
      alert('Please provide a title and valid expense amount.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post('/expenses', form);
      setSuccessMsg('Expense recorded successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      setShowAddModal(false);
      setForm({
        title: '',
        category: 'Rent & Lease',
        amount: '',
        paymentMode: 'CASH',
        date: new Date().toISOString().slice(0, 10),
        receiptNo: '',
        notes: ''
      });
      loadExpenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      loadExpenses();
    } catch (err) {
      alert('Failed to delete expense.');
    }
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (selectedCategory !== 'ALL' && e.category !== selectedCategory) return false;

      if (dateFilter === 'THIS_MONTH') {
        const d = new Date(e.date);
        const now = new Date();
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
      } else if (dateFilter === 'LAST_30_DAYS') {
        const d = new Date(e.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (d < thirtyDaysAgo) return false;
      }

      if (search) {
        const s = search.toLowerCase();
        const matchesTitle = e.title?.toLowerCase().includes(s);
        const matchesCat = e.category?.toLowerCase().includes(s);
        const matchesNotes = e.notes?.toLowerCase().includes(s);
        return matchesTitle || matchesCat || matchesNotes;
      }

      return true;
    });
  }, [expenses, selectedCategory, dateFilter, search]);

  const filteredTotal = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Expense Tracker & Cash Outflow</h2>
          <p className="page-subtitle">Record business overheads, shop expenses, and track net profit deductions</p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Record New Expense
        </button>
      </div>

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-danger">
            <TrendingDown size={22} />
          </div>
          <div>
            <div className="stat-label">Total Outflow (All Time)</div>
            <div className="stat-value text-danger">₹{(stats.totalExpense || 0).toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-warning">
            <Calendar size={22} />
          </div>
          <div>
            <div className="stat-label">This Month Expenses</div>
            <div className="stat-value">₹{(stats.thisMonthExpense || 0).toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-primary">
            <Receipt size={22} />
          </div>
          <div>
            <div className="stat-label">Total Entries Recorded</div>
            <div className="stat-value">{expenses.length} Records</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-primary">
            <Wallet size={22} />
          </div>
          <div>
            <div className="stat-label">Filtered Expense Sum</div>
            <div className="stat-value">₹{filteredTotal.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Category Breakdown Bar */}
      {stats.categoryBreakdown && stats.categoryBreakdown.length > 0 && (
        <div className="dashboard-section-card">
          <div className="dashboard-section-header">
            <h3>📊 Expense Distribution by Category</h3>
          </div>
          <div className="bar-chart mt-3">
            {stats.categoryBreakdown.slice(0, 5).map((item) => (
              <div key={item.category} className="bar-row">
                <span className="bar-label" title={item.category}>{item.category}</span>
                <div className="bar-track">
                  <div className="bar-fill bar-fill-alt" style={{ width: `${Math.min(100, item.percentage)}%` }}></div>
                </div>
                <span className="bar-value">₹{item.total.toLocaleString('en-IN')} ({item.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <input
            type="text"
            className="search-input"
            placeholder="Search expenses by title or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="ALL">All Categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="ALL">All Dates</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Expense Title</th>
              <th>Category</th>
              <th>Payment Mode</th>
              <th>Receipt / Ref</th>
              <th className="text-right">Amount</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center">Loading expenses...</td>
              </tr>
            ) : filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center muted">No expenses found for the selected filter.</td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => (
                <tr key={exp.id}>
                  <td>{new Date(exp.date).toLocaleDateString('en-IN')}</td>
                  <td>
                    <strong>{exp.title}</strong>
                    {exp.notes && <div className="customer-tag-note">{exp.notes}</div>}
                  </td>
                  <td>
                    <span className="product-category-tag">{exp.category}</span>
                  </td>
                  <td><span className="sku-tag">{exp.paymentMode}</span></td>
                  <td>{exp.receiptNo || '-'}</td>
                  <td className="text-right font-bold text-danger">₹{Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="text-center">
                    <button
                      className="btn-trash-item"
                      title="Delete expense record"
                      onClick={() => handleDeleteExpense(exp.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Record Expense Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon-badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                  <TrendingDown size={20} />
                </div>
                <div>
                  <h3>Record Business Expense</h3>
                  <p className="modal-subtitle">Log operational expenses to accurately calculate net profit</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            <form onSubmit={handleAddExpense}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">Expense Title / Description *</label>
                    <input
                      type="text"
                      placeholder="e.g. Shop monthly electricity bill"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Amount (₹) *</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      min="1"
                      step="any"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select
                      value={form.paymentMode}
                      onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="CARD">Debit / Credit Card</option>
                      <option value="BANK_TRANSFER">Net Banking / NEFT</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expense Date</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Receipt / Bill Voucher Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. BILL-94829"
                      value={form.receiptNo}
                      onChange={(e) => setForm({ ...form, receiptNo: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Additional Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Optional notes or remarks..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
