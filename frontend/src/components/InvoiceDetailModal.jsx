import { useState } from 'react';
import {
  X,
  Download,
  Printer,
  MessageSquare,
  IndianRupee,
  Calendar,
  User,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { downloadInvoicePDF, printInvoicePDF, printThermalReceipt, formatCurrency } from '../utils/pdfGenerator';
import api from '../api';

export default function InvoiceDetailModal({
  isOpen,
  onClose,
  invoice,
  business = {},
  onInvoiceUpdated,
  onOpenSMS
}) {
  if (!isOpen || !invoice) return null;

  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [error, setError] = useState('');

  const currency = business.currency || '₹';

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) return;
    setPaying(true);
    setError('');

    try {
      const res = await api.put(`/sales/invoice/${invoice.id}/pay`, {
        amount: Number(payAmount),
        method: payMethod,
        notes: payNotes
      });
      setPayAmount('');
      setPayNotes('');
      setShowPayForm(false);
      if (onInvoiceUpdated) {
        onInvoiceUpdated(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setPaying(false);
    }
  };

  const getStatusBadge = (status, balance) => {
    const s = status || (balance <= 0 ? 'PAID' : 'UNPAID');
    if (s === 'PAID') {
      return <span className="badge badge-success"><CheckCircle size={12} /> PAID</span>;
    }
    if (s === 'PARTIAL') {
      return <span className="badge badge-warning"><Clock size={12} /> PARTIAL ({currency}{balance.toLocaleString('en-IN')} Due)</span>;
    }
    return <span className="badge badge-danger"><AlertCircle size={12} /> UNPAID ({currency}{balance.toLocaleString('en-IN')})</span>;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content invoice-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="flex-align-gap">
              <h3>Invoice #{invoice.invoiceNumber}</h3>
              {getStatusBadge(invoice.status, invoice.balance)}
            </div>
            <p className="modal-subtitle">
              Date: {new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Top Actions Bar */}
          <div className="invoice-actions-strip">
            <button
              className="btn btn-primary"
              onClick={() => downloadInvoicePDF(invoice, business)}
              title="Download official PDF receipt"
            >
              <Download size={15} /> Download PDF
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => printInvoicePDF(invoice, business)}
              title="Open print preview"
            >
              <Printer size={15} /> Print Invoice
            </button>

            <button
              className="btn btn-outline"
              onClick={() => printThermalReceipt(invoice, business)}
              title="Print 58mm/80mm thermal receipt"
            >
              Thermal Receipt
            </button>

            <button
              className="btn btn-sms"
              onClick={() => {
                onClose();
                if (onOpenSMS) {
                  onOpenSMS({
                    id: invoice.customerId,
                    name: invoice.customerName,
                    phone: invoice.customerPhone,
                    totalBalance: invoice.balance
                  }, invoice);
                }
              }}
              title="Send bill summary to customer phone"
            >
              <MessageSquare size={15} /> 1-Click SMS Bill
            </button>

            {invoice.balance > 0 && !showPayForm && (
              <button
                className="btn btn-outline"
                onClick={() => setShowPayForm(true)}
              >
                <IndianRupee size={15} /> Record Payment
              </button>
            )}
          </div>

          {/* Inline Payment Form */}
          {showPayForm && (
            <form className="quick-pay-card" onSubmit={handleRecordPayment}>
              <h4>Record Payment for Balance ({currency}{invoice.balance.toLocaleString('en-IN')})</h4>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-row">
                <input
                  type="number"
                  step="any"
                  max={invoice.balance}
                  placeholder={`Amount (${currency})`}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="Cheque">Cheque</option>
                </select>
                <input
                  type="text"
                  placeholder="Notes / Reference #"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>
              <div className="form-actions mt-2">
                <button type="submit" className="btn btn-primary" disabled={paying}>
                  {paying ? 'Saving...' : 'Confirm Payment'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowPayForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Customer & Bill Meta Details Grid */}
          <div className="invoice-meta-grid">
            <div className="meta-card">
              <div className="meta-card-title"><User size={14} /> Customer Information</div>
              <div className="meta-card-content">
                <strong>{invoice.customerName || 'Walk-in Customer'}</strong>
                {invoice.customerPhone && <div>Phone: {invoice.customerPhone}</div>}
                {invoice.customerAddress && <div>Address: {invoice.customerAddress}</div>}
                {invoice.customerGstin && <div>GSTIN: {invoice.customerGstin}</div>}
              </div>
            </div>

            <div className="meta-card">
              <div className="meta-card-title"><CreditCard size={14} /> Payment & Billing Details</div>
              <div className="meta-card-content">
                <div><strong>Initial Payment Mode:</strong> {invoice.paymentMethod || 'Cash'}</div>
                <div><strong>Invoice Date:</strong> {new Date(invoice.date).toLocaleString('en-IN')}</div>
                {invoice.dueDate && (
                  <div><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString('en-IN')}</div>
                )}
                {invoice.notes && <div><strong>Notes:</strong> {invoice.notes}</div>}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="table-responsive mt-3">
            <table className="data-table invoice-items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product / Item</th>
                  <th>SKU</th>
                  <th className="text-center">Qty</th>
                  <th className="text-right">Unit Price</th>
                  {invoice.items?.some(i => i.discount > 0) && <th className="text-center">Disc</th>}
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td><strong>{item.productName}</strong></td>
                    <td><span className="sku-tag">{item.sku || '-'}</span></td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">{formatCurrency(item.unitPrice, currency)}</td>
                    {invoice.items?.some(i => i.discount > 0) && (
                      <td className="text-center">{item.discount ? `${item.discount}%` : '-'}</td>
                    )}
                    <td className="text-right font-bold">
                      {formatCurrency(item.total || (item.quantity * item.unitPrice), currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="invoice-summary-container">
            <div className="invoice-summary-box">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal || invoice.grandTotal, currency)}</span>
              </div>
              {invoice.discountTotal > 0 && (
                <div className="summary-row text-success">
                  <span>Discount:</span>
                  <span>-{formatCurrency(invoice.discountTotal, currency)}</span>
                </div>
              )}
              {invoice.taxTotal > 0 && (
                <div className="summary-row">
                  <span>Tax / GST ({invoice.taxRate || 0}%):</span>
                  <span>+{formatCurrency(invoice.taxTotal, currency)}</span>
                </div>
              )}
              <div className="summary-row summary-grand-total">
                <span>Grand Total:</span>
                <span>{formatCurrency(invoice.grandTotal, currency)}</span>
              </div>
              <div className="summary-row">
                <span>Total Paid:</span>
                <span className="text-success font-bold">{formatCurrency(invoice.amountPaid, currency)}</span>
              </div>
              <div className="summary-row summary-balance-row">
                <span>Balance Due:</span>
                <span className={invoice.balance > 0 ? 'text-danger font-bold' : 'text-success font-bold'}>
                  {invoice.balance > 0 ? formatCurrency(invoice.balance, currency) : `${currency}0.00 (PAID)`}
                </span>
              </div>
            </div>
          </div>

          {/* Payment History Audit */}
          {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
            <div className="payment-history-section mt-4">
              <h4>Payment History ({invoice.paymentHistory.length})</h4>
              <div className="payment-history-list">
                {invoice.paymentHistory.map((p, idx) => (
                  <div className="payment-history-item" key={p.id || idx}>
                    <div className="payment-history-left">
                      <span className="badge badge-success"><CheckCircle size={11} /> {p.method || 'Payment'}</span>
                      <span className="payment-history-date">
                        {new Date(p.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      {p.notes && <span className="payment-history-notes">• {p.notes}</span>}
                    </div>
                    <div className="payment-history-amount">
                      {formatCurrency(p.amount, currency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
