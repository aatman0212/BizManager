import { useEffect, useState, useMemo, Fragment } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  X,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  IndianRupee,
  Download,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import api from '../api';
import { downloadInvoicePDF, formatCurrency } from '../utils/pdfGenerator';
import SMSModal from '../components/SMSModal';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import RecordPaymentModal from '../components/RecordPaymentModal';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  gstin: '',
  notes: ''
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [businessProfile, setBusinessProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [smsModalState, setSmsModalState] = useState({ isOpen: false, customer: null, invoice: null });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentModalState, setPaymentModalState] = useState({ isOpen: false, customer: null, invoice: null });

  const currency = businessProfile.currency || '₹';

  const loadCustomersAndProfile = async () => {
    setLoading(true);
    try {
      const [custRes, bizRes] = await Promise.all([
        api.get('/customers', { params: { search, pendingOnly } }),
        api.get('/business/profile')
      ]);
      setCustomers(custRes.data || []);
      setBusinessProfile(bizRes.data || {});
    } catch (err) {
      setError('Could not load customer records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(loadCustomersAndProfile, 200);
    return () => clearTimeout(t);
  }, [search, pendingOnly]);

  // Overall customer ledger stats
  const customerStats = useMemo(() => {
    const totalCount = customers.length;
    const totalPurchases = customers.reduce((sum, c) => sum + (Number(c.totalPurchases) || 0), 0);
    const totalPending = customers.reduce((sum, c) => sum + (Number(c.totalBalance) || 0), 0);
    const withPendingCount = customers.filter((c) => Number(c.totalBalance) > 0).length;
    return { totalCount, totalPurchases, totalPending, withPendingCount };
  }, [customers]);

  const openAddForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (customer) => {
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      gstin: customer.gstin || '',
      notes: customer.notes || ''
    });
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, form);
        setSuccessMsg(`Customer "${form.name}" updated successfully!`);
      } else {
        await api.post('/customers', form);
        setSuccessMsg(`Customer "${form.name}" added successfully!`);
      }
      setShowForm(false);
      setForm(emptyForm);
      loadCustomersAndProfile();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete customer "${name}" and all their purchase history records?`)) return;
    try {
      await api.delete(`/customers/${id}`);
      loadCustomersAndProfile();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete customer.');
    }
  };

  const openSMSForCustomer = (customer, invoice = null) => {
    setSmsModalState({
      isOpen: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        totalBalance: customer.totalBalance
      },
      invoice
    });
  };

  return (
    <div className="page">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h2>Customer Directory & 1-Click SMS</h2>
          <p className="page-subtitle">Manage customer profiles, purchase history, and 1-click SMS payment reminders</p>
        </div>
        <button className="btn btn-primary" onClick={openAddForm}>
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Customer KPI Cards */}
      <div className="stat-grid mb-4">
        <div className="stat-card">
          <div className="stat-icon stat-icon-primary"><User size={18} /></div>
          <div>
            <div className="stat-label">Total Customers</div>
            <div className="stat-value">{customerStats.totalCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-primary"><IndianRupee size={18} /></div>
          <div>
            <div className="stat-label">Total Lifetime Spend</div>
            <div className="stat-value">{formatCurrency(customerStats.totalPurchases, currency)}</div>
          </div>
        </div>

        <div className={`stat-card ${customerStats.totalPending > 0 ? 'stat-warning' : ''}`}>
          <div className={`stat-icon ${customerStats.totalPending > 0 ? 'stat-icon-warning' : 'stat-icon-primary'}`}>
            <Clock size={18} />
          </div>
          <div>
            <div className="stat-label">Pending Receivables Due</div>
            <div className="stat-value">{formatCurrency(customerStats.totalPending, currency)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-primary"><MessageSquare size={18} /></div>
          <div>
            <div className="stat-label">Customers with Due Balance</div>
            <div className="stat-value">{customerStats.withPendingCount}</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by customer name, phone number, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => setPendingOnly(e.target.checked)}
          />
          Show only customers with pending balances
        </label>
      </div>

      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Customer Form Modal/Drawer */}
      {showForm && (
        <form className="inline-form" onSubmit={handleSubmit}>
          <div className="form-header-row">
            <h3>{editingId ? 'Edit Customer Profile' : 'Add New Customer'}</h3>
            <button type="button" className="btn-close-form" onClick={() => setShowForm(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                placeholder="e.g. Rahul Sharma"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number (10 digits) *</label>
              <input
                placeholder="e.g. 9876543210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                placeholder="e.g. rahul@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">GSTIN / Tax Number</label>
              <input
                placeholder="e.g. 27AAAAA0000A1Z5"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Billing / Shipping Address</label>
              <input
                placeholder="e.g. Flat 102, Green Avenue, Mumbai, Maharashtra"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Internal Customer Notes / Tags</label>
              <input
                placeholder="e.g. Regular VIP customer, preferred delivery on weekends"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="form-actions mt-3">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Save Changes' : 'Create Customer'}
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

      {/* Customer Directory Table */}
      {loading ? (
        <p>Loading customers...</p>
      ) : customers.length === 0 ? (
        <div className="empty-state-card">
          <p className="muted">No customers found. Click "+ Add Customer" to create your first customer profile.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Contact Info</th>
                <th>Address & GST</th>
                <th className="text-right">Total Purchases</th>
                <th className="text-right">Balance Due</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <Fragment key={c.id}>
                  <tr className={expandedId === c.id ? 'row-expanded' : ''}>
                    <td>
                      <button
                        type="button"
                        className="link-btn customer-name-btn"
                        onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                        title="Click to view full purchase history"
                      >
                        {expandedId === c.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <strong>{c.name}</strong>
                      </button>
                      {c.notes && <div className="customer-tag-note">{c.notes}</div>}
                    </td>

                    <td>
                      <div className="contact-line">
                        <Phone size={12} className="inline-icon muted" />
                        <span>{c.phone}</span>
                      </div>
                      {c.email && (
                        <div className="contact-line small-text muted">
                          <Mail size={12} className="inline-icon" />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </td>

                    <td>
                      <div className="small-text">{c.address || '-'}</div>
                      {c.gstin && <div className="gstin-tag">GST: {c.gstin}</div>}
                    </td>

                    <td className="text-right font-bold">
                      {formatCurrency(c.totalPurchases || 0, currency)}
                    </td>

                    <td className="text-right">
                      {c.totalBalance > 0 ? (
                        <span className="badge badge-danger">
                          <Clock size={11} /> {formatCurrency(c.totalBalance, currency)} Due
                        </span>
                      ) : (
                        <span className="badge badge-success">Paid up</span>
                      )}
                    </td>

                    <td className="actions-cell">
                      {c.totalBalance > 0 && (
                        <button
                          type="button"
                          className="btn btn-small btn-primary"
                          style={{ background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)', borderColor: '#047857', fontWeight: 700 }}
                          onClick={() => setPaymentModalState({ isOpen: true, customer: c, invoice: null })}
                          title="Record inward payment against outstanding balance"
                        >
                          <IndianRupee size={13} /> Collect Due
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-sms"
                        onClick={() => openSMSForCustomer(c)}
                        title="Send 1-Click SMS Reminder or Offer"
                      >
                        <MessageSquare size={14} />
                        1-Click SMS
                      </button>

                      <button
                        type="button"
                        className="btn btn-small"
                        onClick={() => openEditForm(c)}
                        title="Edit profile"
                      >
                        <Pencil size={13} /> Edit
                      </button>

                      <button
                        type="button"
                        className="btn btn-small btn-danger"
                        onClick={() => handleDelete(c.id, c.name)}
                        title="Delete customer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Purchase History Sub-table */}
                  {expandedId === c.id && (
                    <tr className="expanded-row" key={`${c.id}-history`}>
                      <td colSpan={6}>
                        <div className="history-drawer-content">
                          <div className="history-drawer-header">
                            <h4>
                              📜 Purchase History for {c.name} ({c.invoices?.length || 0} Bills)
                            </h4>
                            {c.totalBalance > 0 && (
                              <button
                                type="button"
                                className="btn btn-small btn-sms"
                                onClick={() => openSMSForCustomer(c)}
                              >
                                <MessageSquare size={13} /> Send Due Reminder SMS ({formatCurrency(c.totalBalance, currency)})
                              </button>
                            )}
                          </div>

                          {!c.invoices || c.invoices.length === 0 ? (
                            <p className="muted">No purchases recorded for this customer yet.</p>
                          ) : (
                            <table className="mini-table">
                              <thead>
                                <tr>
                                  <th>Invoice #</th>
                                  <th>Date</th>
                                  <th>Items Purchased</th>
                                  <th className="text-right">Bill Total</th>
                                  <th className="text-right">Paid</th>
                                  <th className="text-right">Balance</th>
                                  <th>Status</th>
                                  <th>Bill Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.invoices.map((inv) => {
                                  const itemsText = (inv.items || [])
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
                                      <td className="items-summary-cell" title={itemsText}>
                                        {itemsText || '1 item'}
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
                                        {inv.balance <= 0 ? (
                                          <span className="badge badge-success">PAID</span>
                                        ) : (
                                          <span className="badge badge-warning">DUE</span>
                                        )}
                                      </td>
                                      <td className="actions-cell">
                                        {inv.balance > 0 && (
                                          <button
                                            type="button"
                                            className="btn btn-small"
                                            style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0', fontWeight: 700 }}
                                            onClick={() => setPaymentModalState({ isOpen: true, customer: c, invoice: inv })}
                                            title="Pay towards this bill balance"
                                          >
                                            <IndianRupee size={12} /> Pay Due
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          className="btn btn-small"
                                          onClick={() => setSelectedInvoice(inv)}
                                          title="View Invoice Details"
                                        >
                                          <Eye size={12} /> Details
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-small btn-primary"
                                          onClick={() => downloadInvoicePDF(inv, businessProfile)}
                                          title="Download PDF Bill"
                                        >
                                          <Download size={12} /> PDF
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-small btn-sms"
                                          onClick={() => openSMSForCustomer(c, inv)}
                                          title="Send Receipt SMS"
                                        >
                                          <MessageSquare size={12} /> SMS
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 1-Click SMS Modal */}
      <SMSModal
        isOpen={smsModalState.isOpen}
        onClose={() => setSmsModalState({ isOpen: false, customer: null, invoice: null })}
        customer={smsModalState.customer}
        invoice={smsModalState.invoice}
        business={businessProfile}
      />

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        business={businessProfile}
        onInvoiceUpdated={() => loadCustomersAndProfile()}
        onOpenSMS={(cust, inv) => openSMSForCustomer(cust, inv)}
      />

      {/* Record Balance Payment Modal */}
      <RecordPaymentModal
        isOpen={paymentModalState.isOpen}
        onClose={() => setPaymentModalState({ isOpen: false, customer: null, invoice: null })}
        customer={paymentModalState.customer}
        invoice={paymentModalState.invoice}
        business={businessProfile}
        onSuccess={() => {
          setSuccessMsg('Payment recorded successfully!');
          loadCustomersAndProfile();
          setTimeout(() => setSuccessMsg(''), 3000);
        }}
      />
    </div>
  );
}
