import { useState, useEffect } from 'react';
import { X, Send, Check, Sparkles, MessageSquare, AlertCircle, ExternalLink } from 'lucide-react';
import api from '../api';

export default function SMSModal({ isOpen, onClose, customer, invoice, business = {} }) {
  if (!isOpen || !customer) return null;

  const [selectedTemplateId, setSelectedTemplateId] = useState('payment_reminder');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const currency = business.currency || '₹';
  const businessName = business.businessName || 'BizManager';
  const businessPhone = business.mobile || '';

  // Clean, focused SMS templates
  const templates = [
    {
      id: 'payment_reminder',
      name: '💳 Payment Due Reminder',
      template: `Dear ${customer.name}, this is a gentle reminder that you have a pending balance of ${currency}${(customer.totalBalance || invoice?.balance || 0).toLocaleString('en-IN')} with ${businessName}. Please clear it at your earliest convenience. Thank you!`
    },
    {
      id: 'bill_receipt',
      name: '🧾 Bill / Invoice Receipt',
      template: `Hello ${customer.name}, thank you for your purchase at ${businessName}! Your Invoice #${invoice?.invoiceNumber || 'INV'} for ${currency}${(invoice?.grandTotal || customer.totalPurchases || 0).toLocaleString('en-IN')} is confirmed. Paid: ${currency}${(invoice?.amountPaid || 0).toLocaleString('en-IN')}, Balance: ${currency}${(invoice?.balance || 0).toLocaleString('en-IN')}. Have a great day!`
    },
    {
      id: 'thank_you',
      name: '🙏 Customer Thank You Note',
      template: `Dear ${customer.name}, thank you for choosing ${businessName}! We deeply value your trust and look forward to serving you again soon.`
    },
    {
      id: 'festive_offer',
      name: '🎁 Special Offers & Discounts',
      template: `🎉 Special Offer for ${customer.name}! Enjoy up to 25% OFF on 4K TVs, Laptops & Audio gear at ${businessName}. Visit our store or call ${businessPhone || 'us'} today for exchange offers!`
    },
    {
      id: 'deals',
      name: '🚀 New Electronics Deals',
      template: `🚀 New Arrivals for ${customer.name}! Latest Apple iPhone 15, MacBook Air M2 and Sony ANC Headphones are in stock at ${businessName} with 0% Easy EMI!`
    },
    {
      id: 'custom',
      name: '✍️ Custom Message',
      template: `Dear ${customer.name}, `
    }
  ];

  useEffect(() => {
    if (invoice) {
      setSelectedTemplateId('bill_receipt');
      const tmpl = templates.find(t => t.id === 'bill_receipt');
      setMessage(tmpl ? tmpl.template : '');
    } else {
      setSelectedTemplateId('payment_reminder');
      const tmpl = templates.find(t => t.id === 'payment_reminder');
      setMessage(tmpl ? tmpl.template : '');
    }
    setStatusMsg(null);
  }, [customer, invoice]);

  const handleTemplateChange = (templateId) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl) {
      setMessage(tmpl.template);
    }
    setStatusMsg(null);
  };

  // 1-Click WhatsApp Send: Opens WhatsApp directly with customer number and formatted message
  const handleSendWhatsApp = async () => {
    if (!message.trim()) return;
    const cleanDigits = (customer.phone || '').replace(/\D/g, '');
    const phone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    // Log to backend audit
    try {
      await api.post('/sms/send', {
        customerId: customer.id,
        customerName: customer.name,
        phone: customer.phone,
        message,
        templateType: selectedTemplateId
      });
    } catch (e) {}

    setStatusMsg({
      type: 'success',
      text: `WhatsApp opened for ${customer.name} (+${phone}) with the message pre-filled. Just tap Send!`
    });
  };

  // 1-Click Send SMS: Opens Link to Windows / Phone Messages App with phone & body auto-filled
  const handleSendSMS = async () => {
    if (!message.trim()) return;
    setSending(true);
    setStatusMsg(null);

    const cleanDigits = (customer.phone || '').replace(/\D/g, '');
    let formattedPhone = cleanDigits;
    if (cleanDigits.length === 10) {
      formattedPhone = `+91${cleanDigits}`;
    } else if (cleanDigits.startsWith('91') && cleanDigits.length === 12) {
      formattedPhone = `+${cleanDigits}`;
    } else if (!cleanDigits.startsWith('+')) {
      formattedPhone = `+${cleanDigits}`;
    }

    const encodedBody = encodeURIComponent(message);
    const smsUri = `sms:${formattedPhone}?body=${encodedBody}`;

    // Direct protocol trigger for Windows Phone Link / Link to Windows
    try {
      window.location.href = smsUri;
    } catch (e) {
      const a = document.createElement('a');
      a.href = smsUri;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    try {
      await api.post('/sms/send', {
        customerId: customer.id,
        customerName: customer.name,
        phone: customer.phone,
        message,
        templateType: selectedTemplateId
      });

      setStatusMsg({
        type: 'success',
        text: `Opened Phone Messages app for ${customer.name} (${formattedPhone}) with details pre-filled. Just tap Send!`
      });
    } catch (err) {
      setStatusMsg({
        type: 'success',
        text: `Opened in Messaging app for ${customer.name} (${formattedPhone}).`
      });
    } finally {
      setSending(false);
    }
  };

  const charCount = message.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content sms-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3>1-Click Customer SMS & WhatsApp</h3>
              <p className="modal-subtitle">
                Dispatch instant bill receipts, payment reminders, and notes to <strong>{customer.name}</strong> ({customer.phone})
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Customer Summary Chip */}
          <div className="sms-customer-chip">
            <div>
              <strong>Customer:</strong> {customer.name}
            </div>
            <div>
              <strong>Phone:</strong> {customer.phone}
            </div>
            <div>
              <strong>Pending Balance:</strong>{' '}
              <span className={customer.totalBalance > 0 ? 'text-danger font-bold' : 'text-success'}>
                {currency}{(customer.totalBalance || invoice?.balance || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Template Selector */}
          <div className="form-group">
            <label className="form-label">
              <Sparkles size={14} className="inline-icon" /> Select Message Template:
            </label>
            <div className="template-pills">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`template-pill ${selectedTemplateId === t.id ? 'active' : ''}`}
                  onClick={() => handleTemplateChange(t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Message Area */}
          <div className="form-group">
            <div className="textarea-header">
              <label className="form-label">Message Text (Pre-filled):</label>
              <div className="char-counter">
                {charCount} characters • {smsSegments} SMS {smsSegments > 1 ? 'parts' : 'part'}
              </div>
            </div>
            <textarea
              className="sms-textarea"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message text here..."
            />
          </div>

          {/* Status Notification */}
          {statusMsg && (
            <div className={`alert ${statusMsg.type === 'success' ? 'alert-success' : 'alert-error'} mt-2`}>
              {statusMsg.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
          >
            Close
          </button>

          <div className="flex-align-gap">
            <button
              type="button"
              className="btn btn-success"
              style={{ background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)', color: 'white', fontWeight: 700 }}
              onClick={handleSendWhatsApp}
              disabled={!message.trim()}
              title="Open directly in WhatsApp Web or Mobile App"
            >
              <ExternalLink size={15} /> Send via WhatsApp
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sms-action"
              onClick={handleSendSMS}
              disabled={sending || !message.trim()}
              title="Open in your device Phone / Messages app"
            >
              <Send size={15} /> {sending ? 'Opening...' : 'Send SMS (Device / Link)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
