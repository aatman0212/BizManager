import { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  Banknote,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  Building,
  Lock
} from 'lucide-react';
import QRCode from 'qrcode';
import { getUpiPaymentUrl, formatCurrency } from '../utils/pdfGenerator';

export default function PaymentModal({
  isOpen,
  onClose,
  cart = [],
  customer = {},
  summary = {}, // { subtotal, discountTotal, taxTotal, taxRate, taxMode, grandTotal }
  business = {},
  paymentMethod = 'UPI', // Passed from POS screen selection
  onConfirmCheckout,
  submitting = false
}) {
  if (!isOpen) return null;

  const currency = business.currency || '₹';
  const grandTotal = summary.grandTotal || 0;

  // Active payment method strictly follows POS selection
  const activeMethod = paymentMethod === 'Credit/Due' ? 'Credit' : (paymentMethod || 'UPI');

  // Amount Inputs
  const [amountPaid, setAmountPaid] = useState(grandTotal);
  const [cashTendered, setCashTendered] = useState(grandTotal);
  const [cardRef, setCardRef] = useState('');
  const [notes, setNotes] = useState('');

  // UPI QR Code
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [upiCopied, setUpiCopied] = useState(false);

  // Sync default amount when modal opens or total changes
  useEffect(() => {
    setAmountPaid(grandTotal);
    setCashTendered(grandTotal);
  }, [grandTotal, isOpen, paymentMethod]);

  // Generate UPI QR Code dynamically (LOCKED strictly to grandTotal)
  useEffect(() => {
    if (activeMethod === 'UPI') {
      const fakeInvForQr = {
        invoiceNumber: 'BILL',
        grandTotal: grandTotal,
        balance: grandTotal
      };

      const upiLink = getUpiPaymentUrl(fakeInvForQr, business);
      if (upiLink && business.upiId) {
        QRCode.toDataURL(upiLink, { width: 240, margin: 1, errorCorrectionLevel: 'M' })
          .then((url) => setQrDataUrl(url))
          .catch(() => setQrDataUrl(''));
      } else {
        setQrDataUrl('');
      }
    }
  }, [grandTotal, activeMethod, business]);

  // Calculations
  const calculatedPaid = activeMethod === 'Credit' ? 0 : (activeMethod === 'Cash' ? (Number(amountPaid) || 0) : grandTotal);
  const changeToReturn = activeMethod === 'Cash' ? Math.max(0, (Number(cashTendered) || 0) - grandTotal) : 0;

  const handleCopyUpi = () => {
    if (business.upiId) {
      navigator.clipboard.writeText(business.upiId);
      setUpiCopied(true);
      setTimeout(() => setUpiCopied(false), 2000);
    }
  };

  const handleFinalSubmit = () => {
    const payload = {
      paymentMethod: activeMethod === 'Credit' ? 'Credit/Due' : activeMethod,
      amountPaid: calculatedPaid,
      cashAmount: activeMethod === 'Cash' ? calculatedPaid : 0,
      upiAmount: activeMethod === 'UPI' ? grandTotal : 0,
      cardAmount: activeMethod === 'Card' ? grandTotal : 0,
      notes: notes.trim()
    };
    onConfirmCheckout(payload);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content payment-gateway-modal animate-scale-in" style={{ maxWidth: '580px', borderRadius: '16px' }}>
        {/* Header */}
        <div className="modal-header payment-gateway-header" style={{ padding: '16px 20px' }}>
          <div>
            <div className="flex-align-gap">
              <span className="payment-badge-pill">
                {activeMethod === 'UPI' ? '📱 UPI PAYMENT' : activeMethod === 'Cash' ? '💵 CASH PAYMENT' : activeMethod === 'Card' ? '💳 CARD PAYMENT' : '⏳ CREDIT / DUE'}
              </span>
              <h3 className="modal-title m-0">Collect Payment</h3>
            </div>
            <p className="modal-subtitle">
              Customer: <strong>{customer.name || 'Walk-in Customer'}</strong> {customer.phone ? `(${customer.phone})` : ''} • {cart.length} item(s)
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body payment-gateway-body" style={{ padding: '18px 22px' }}>
          {/* Top Amount Banner */}
          <div className="payment-amount-banner" style={{ margin: '0 0 16px 0' }}>
            <div className="banner-subtext">TOTAL BILL AMOUNT</div>
            <div className="banner-amount-value">{formatCurrency(grandTotal, currency)}</div>
            <div className="banner-details">
              <span>Subtotal: {formatCurrency(summary.subtotal, currency)}</span>
              {summary.discountTotal > 0 && <span> • Disc: -{formatCurrency(summary.discountTotal, currency)}</span>}
              {summary.taxTotal > 0 && <span> • GST ({summary.taxRate}% {summary.taxMode === 'inclusive' ? 'Incl.' : ''}): {formatCurrency(summary.taxTotal, currency)}</span>}
            </div>
          </div>

          {/* 1. UPI QR Code Gateway View */}
          {activeMethod === 'UPI' && (
            <div className="payment-tab-content-card" style={{ background: '#ffffff', border: '1.5px solid #cbd5e1' }}>
              <div className="upi-gateway-view">
                <div className="upi-qr-column" style={{ textAlign: 'center' }}>
                  {qrDataUrl ? (
                    <div className="upi-qr-frame">
                      <img src={qrDataUrl} alt="UPI Payment QR Code" className="upi-live-qr" style={{ width: '180px', height: '180px' }} />
                      <div className="upi-scan-hint">Scan with GPay / PhonePe / Paytm / BHIM</div>
                    </div>
                  ) : (
                    <div className="upi-no-qr-card">
                      <AlertCircle size={32} className="text-warning" style={{ margin: '0 auto 8px auto' }} />
                      <strong>UPI ID Not Set</strong>
                      <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Configure your UPI ID in Settings to display live QR code.</p>
                    </div>
                  )}
                </div>

                <div className="upi-meta-column">
                  <div className="upi-meta-group">
                    <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Receiving UPI VPA</label>
                    <div className="upi-id-badge">
                      <span>{business.upiId || 'Not Set (Check Settings)'}</span>
                      {business.upiId && (
                        <button type="button" className="btn-copy-upi" onClick={handleCopyUpi} title="Copy UPI ID">
                          {upiCopied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* LOCKED READ-ONLY BILL AMOUNT */}
                  <div className="upi-meta-group mt-3">
                    <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={12} /> Fixed Bill Amount ({currency})
                    </label>
                    <div style={{
                      background: '#f1f5f9',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      color: '#1e293b'
                    }}>
                      {formatCurrency(grandTotal, currency)}
                    </div>
                  </div>

                  <div className="upi-status-indicator mt-3">
                    <CheckCircle size={16} className="text-success" />
                    <span style={{ fontSize: '0.78rem' }}>Customer will see exact bill amount <strong>{formatCurrency(grandTotal, currency)}</strong> on their UPI app</span>
                  </div>
                </div>
              </div>

              {/* SINGLE CLEAR CONFIRM BUTTON */}
              <div className="mt-4 pt-3 border-top">
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                    borderColor: '#047857',
                    boxShadow: '0 4px 0 #047857, 0 8px 16px rgba(5, 150, 105, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  disabled={submitting}
                  onClick={handleFinalSubmit}
                >
                  <CheckCircle size={20} />
                  <span>{submitting ? 'Processing Payment...' : `Confirm UPI Payment Received (${formatCurrency(grandTotal, currency)})`}</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. Cash Payment View */}
          {activeMethod === 'Cash' && (
            <div className="payment-tab-content-card" style={{ background: '#ffffff', border: '1.5px solid #cbd5e1' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Total Bill Amount ({currency})</label>
                  <div style={{
                    background: '#f1f5f9',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: '#1e293b'
                  }}>
                    {formatCurrency(grandTotal, currency)}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Cash Tendered by Customer ({currency})</label>
                  <input
                    type="number"
                    className="form-control font-bold"
                    style={{ fontSize: '1.2rem', padding: '10px 12px' }}
                    value={cashTendered}
                    onChange={(e) => {
                      setCashTendered(e.target.value);
                      setAmountPaid(Math.min(grandTotal, Number(e.target.value) || 0));
                    }}
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Cash Denomination Buttons */}
              <div className="quick-denominations-row mt-2">
                <span className="deno-label">Quick Tender:</span>
                <button type="button" className="btn-deno" onClick={() => { setCashTendered(grandTotal); setAmountPaid(grandTotal); }}>
                  Exact ({currency}{grandTotal})
                </button>
                <button type="button" className="btn-deno" onClick={() => setCashTendered(Number(cashTendered || 0) + 100)}>
                  +100
                </button>
                <button type="button" className="btn-deno" onClick={() => setCashTendered(Number(cashTendered || 0) + 500)}>
                  +500
                </button>
                <button type="button" className="btn-deno" onClick={() => setCashTendered(Math.ceil(grandTotal / 500) * 500)}>
                  Round 500
                </button>
                <button type="button" className="btn-deno" onClick={() => setCashTendered(Math.ceil(grandTotal / 1000) * 1000)}>
                  Round 1000
                </button>
              </div>

              {/* Change Return Box */}
              {Number(cashTendered) > grandTotal && (
                <div className="change-return-box mt-3 animate-fade-in">
                  <div className="change-label">CHANGE TO RETURN CUSTOMER:</div>
                  <div className="change-amount">{formatCurrency(changeToReturn, currency)}</div>
                </div>
              )}

              {/* SINGLE CLEAR CONFIRM BUTTON */}
              <div className="mt-4 pt-3 border-top">
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                    borderColor: '#047857',
                    boxShadow: '0 4px 0 #047857, 0 8px 16px rgba(5, 150, 105, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  disabled={submitting}
                  onClick={handleFinalSubmit}
                >
                  <CheckCircle size={20} />
                  <span>{submitting ? 'Processing Payment...' : `Confirm Cash Received (${formatCurrency(calculatedPaid, currency)})`}</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. Card Payment View */}
          {activeMethod === 'Card' && (
            <div className="payment-tab-content-card" style={{ background: '#ffffff', border: '1.5px solid #cbd5e1' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Amount Charged ({currency})</label>
                  <div style={{
                    background: '#f1f5f9',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: '#1e293b'
                  }}>
                    {formatCurrency(grandTotal, currency)}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Card Auth / Txn Reference (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-8942"
                    value={cardRef}
                    onChange={(e) => setCardRef(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>

              {/* SINGLE CLEAR CONFIRM BUTTON */}
              <div className="mt-4 pt-3 border-top">
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    background: 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)',
                    borderColor: '#4338ca',
                    boxShadow: '0 4px 0 #3730a3, 0 8px 16px rgba(79, 70, 229, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  disabled={submitting}
                  onClick={handleFinalSubmit}
                >
                  <CheckCircle size={20} />
                  <span>{submitting ? 'Processing Payment...' : `Confirm Card Payment (${formatCurrency(grandTotal, currency)})`}</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. Credit / Due View */}
          {activeMethod === 'Credit' && (
            <div className="payment-tab-content-card" style={{ background: '#ffffff', border: '1.5px solid #cbd5e1' }}>
              <div className="alert alert-warning m-0 mb-3">
                <AlertCircle size={20} />
                <div>
                  <strong>Credit / Due Sale</strong>
                  <p className="m-0 text-xs">
                    The full amount (<strong>{formatCurrency(grandTotal, currency)}</strong>) will be recorded as pending balance on customer <strong>{customer.name}</strong>'s ledger.
                  </p>
                </div>
              </div>

              {/* SINGLE CLEAR CONFIRM BUTTON */}
              <div className="mt-4 pt-3 border-top">
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                    borderColor: '#b45309',
                    boxShadow: '0 4px 0 #b45309, 0 8px 16px rgba(217, 119, 6, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  disabled={submitting}
                  onClick={handleFinalSubmit}
                >
                  <CheckCircle size={20} />
                  <span>{submitting ? 'Processing Sale...' : `Save Credit Sale (${formatCurrency(grandTotal, currency)})`}</span>
                </button>
              </div>
            </div>
          )}

          {/* Remarks */}
          <div className="form-group mt-3">
            <label className="form-label text-xs">Remarks / Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Paid via GPay / 2000 Note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-control form-control-sm"
            />
          </div>
        </div>

        {/* Footer Cancel */}
        <div className="modal-footer" style={{ padding: '12px 20px', background: '#f8fafc' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel & Return to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
