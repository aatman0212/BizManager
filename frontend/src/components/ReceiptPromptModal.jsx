import {
  CheckCircle2,
  Printer,
  Download,
  MessageSquare,
  X,
  Receipt,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { formatCurrency, printThermalReceipt, downloadInvoicePDF } from '../utils/pdfGenerator';

export default function ReceiptPromptModal({
  isOpen,
  onClose,
  invoice,
  business = {},
  onOpenSmsModal
}) {
  if (!isOpen || !invoice) return null;

  const currency = business.currency || '₹';
  const isPaid = (invoice.balance || 0) <= 0;

  const handlePrintThermal = () => {
    printThermalReceipt(invoice, business);
    onClose();
  };

  const handleDownloadPDF = () => {
    downloadInvoicePDF(invoice, business);
    onClose();
  };

  const handleSendSms = () => {
    if (onOpenSmsModal) {
      onOpenSmsModal(invoice);
    }
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content animate-scale-in" style={{ maxWidth: '520px', borderRadius: '16px', overflow: 'hidden', padding: 0 }}>
        {/* Top Success Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          padding: '28px 24px 22px 24px',
          textAlign: 'center',
          color: '#ffffff',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>

          <div style={{
            width: '64px',
            height: '64px',
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(4px)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
          }}>
            <CheckCircle2 size={38} color="#ffffff" />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            Payment Successful!
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>
            Sale recorded & stock updated automatically
          </p>
        </div>

        {/* Invoice Mini Summary Card */}
        <div style={{ padding: '20px 24px 10px 24px' }}>
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Invoice No.
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                {invoice.invoiceNumber}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                {invoice.customerName || 'Walk-in Customer'} • {invoice.paymentMethod || 'Cash'}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Paid
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                {formatCurrency(invoice.amountPaid || invoice.grandTotal, currency)}
              </div>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                background: isPaid ? '#dcfce7' : '#fef3c7',
                color: isPaid ? '#15803d' : '#b45309',
                marginTop: '3px'
              }}>
                {isPaid ? 'PAID' : `DUE: ${formatCurrency(invoice.balance, currency)}`}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'center', margin: '20px 0 12px 0' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
              How would you like the receipt?
            </span>
          </div>

          {/* Action Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* 1. Thermal Bill Button */}
            <button
              type="button"
              onClick={handlePrintThermal}
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '10px',
                border: '1.5px solid #0f172a',
                background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                color: '#ffffff',
                fontSize: '0.98rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                boxShadow: '0 4px 0 #020617, 0 6px 12px rgba(15, 23, 42, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '6px', borderRadius: '6px' }}>
                  <Printer size={18} />
                </div>
                <span>Print Thermal Receipt (80mm / 58mm)</span>
              </div>
              <span style={{ fontSize: '0.75rem', background: '#3b82f6', padding: '2px 8px', borderRadius: '10px' }}>Fast</span>
            </button>

            {/* 2. PDF Bill Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                color: '#1e293b',
                fontSize: '0.92rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                boxShadow: '0 2px 0 #cbd5e1',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#f1f5f9', padding: '6px', borderRadius: '6px', color: '#4f46e5' }}>
                  <Download size={18} />
                </div>
                <span>Download A4 PDF Tax Invoice</span>
              </div>
              <ArrowRight size={16} color="#94a3b8" />
            </button>

            {/* 3. Send SMS */}
            {invoice.customerPhone && (
              <button
                type="button"
                onClick={handleSendSms}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  border: '1.5px solid #86efac',
                  background: '#f0fdf4',
                  color: '#15803d',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxShadow: '0 2px 0 #86efac',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#dcfce7', padding: '6px', borderRadius: '6px' }}>
                    <MessageSquare size={18} />
                  </div>
                  <span>Send 1-Click SMS to {invoice.customerPhone}</span>
                </div>
                <ArrowRight size={16} color="#15803d" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom "No Receipt / Next Sale" Button */}
        <div style={{ padding: '16px 24px 22px 24px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: '#f1f5f9',
              color: '#475569',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            ✕ No Receipt / Start Next Sale
          </button>
        </div>
      </div>
    </div>
  );
}
