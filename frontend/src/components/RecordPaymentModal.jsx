import { useState, useEffect } from 'react';
import {
  X,
  IndianRupee,
  CreditCard,
  QrCode,
  Banknote,
  Building,
  CheckCircle,
  AlertCircle,
  Clock,
  Check,
  User,
  Receipt
} from 'lucide-react';
import api from '../api';
import { formatCurrency } from '../utils/pdfGenerator';

export default function RecordPaymentModal({
  isOpen,
  onClose,
  customer = null, // { id, name, phone, totalBalance }
  invoice = null,   // { id, invoiceNumber, customerName, grandTotal, amountPaid, balance }
  business = {},
  onSuccess
}) {
  if (!isOpen) return null;

  const currency = business.currency || '₹';

  // Determine balance due from customer or invoice
  const targetBalance = invoice
    ? Number(invoice.balance || 0)
    : customer
    ? Number(customer.totalBalance || 0)
    : 0;

  const titleName = invoice
    ? `Invoice #${invoice.invoiceNumber || invoice.id?.slice(0, 8)}`
    : customer
    ? customer.name
    : 'Customer';

  const [amount, setAmount] = useState(targetBalance);
  const [method, setMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setAmount(targetBalance);
    setMethod('Cash');
    setNotes('');
    setError('');
  }, [isOpen, targetBalance]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payNum = Number(amount);
    if (!payNum || payNum <= 0) {
      setError('Please enter a valid payment amount greater than 0.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (invoice) {
        // Pay against specific invoice
        await api.put(`/sales/invoice/${invoice.id}/pay`, {
          amount: payNum,
          method,
          notes: notes.trim()
        });
      } else if (customer) {
        // Pay against customer khata account
        await api.post(`/customers/${customer.id}/pay`, {
          amount: payNum,
          method,
          notes: notes.trim()
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content animate-scale-in" style={{ maxWidth: '500px', borderRadius: '16px' }}>
        {/* Header */}
        <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <div className="flex-align-gap">
              <span className="payment-badge-pill" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                💵 INWARD PAYMENT
              </span>
              <h3 className="modal-title m-0">Record Balance Payment</h3>
            </div>
            <p className="modal-subtitle">
              {invoice ? (
                <>Recording payment for Bill <strong>#{invoice.invoiceNumber}</strong> ({invoice.customerName || 'Walk-in'})</>
              ) : (
                <>Recording payment from customer <strong>{customer?.name}</strong> {customer?.phone ? `(${customer.phone})` : ''}</>
              )}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px' }}>
            {error && (
              <div className="alert alert-danger mb-3">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Pending Balance Banner */}
            <div style={{
              background: '#fef2f2',
              border: '1.5px solid #fecaca',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px'
            }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Current Outstanding Due
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                  {formatCurrency(targetBalance, currency)}
                </div>
              </div>
              <span style={{
                background: '#fee2e2',
                color: '#b91c1c',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                PENDING
              </span>
            </div>

            {/* Amount Input */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Amount Received ({currency}) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                className="form-control font-bold"
                style={{ fontSize: '1.25rem', padding: '10px 14px' }}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Quick Denomination Chips */}
            <div className="quick-denominations-row mt-2 mb-3">
              <span className="deno-label">Quick Set:</span>
              <button
                type="button"
                className="btn-deno"
                onClick={() => setAmount(targetBalance)}
              >
                Full Due ({currency}{targetBalance})
              </button>
              {targetBalance > 500 && (
                <button
                  type="button"
                  className="btn-deno"
                  onClick={() => setAmount(500)}
                >
                  {currency}500
                </button>
              )}
              {targetBalance > 1000 && (
                <button
                  type="button"
                  className="btn-deno"
                  onClick={() => setAmount(1000)}
                >
                  {currency}1,000
                </button>
              )}
              {targetBalance > 2000 && (
                <button
                  type="button"
                  className="btn-deno"
                  onClick={() => setAmount(2000)}
                >
                  {currency}2,000
                </button>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Payment Mode <span className="text-danger">*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { id: 'Cash', label: 'Cash', icon: Banknote },
                  { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                  { id: 'Card', label: 'Card / POS', icon: CreditCard },
                  { id: 'Bank', label: 'Bank / NEFT', icon: Building }
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #4f46e5' : '1.5px solid #cbd5e1',
                        background: isSelected ? '#eef2ff' : '#ffffff',
                        color: isSelected ? '#4338ca' : '#475569',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '0.82rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon size={18} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Remarks / Reference */}
            <div className="form-group mt-3">
              <label className="form-label">Payment Remarks / Reference (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Paid via GPay / Cheque #98213"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-control"
              />
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                borderColor: '#047857',
                boxShadow: '0 3px 0 #047857',
                fontWeight: 800,
                padding: '10px 20px'
              }}
              disabled={loading}
            >
              <CheckCircle size={16} />
              <span>{loading ? 'Recording...' : `Confirm Payment (${formatCurrency(Number(amount) || 0, currency)})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
