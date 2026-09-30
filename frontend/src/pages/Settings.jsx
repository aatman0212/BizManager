import { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Save,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Sparkles,
  Check,
  Trash2,
  ExternalLink
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { businessName: currentBizName } = useAuth();
  const [profile, setProfile] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    mobile: '',
    address: '',
    gstin: '',
    currency: '₹',
    invoicePrefix: 'INV',
    invoiceNotes: 'Thank you for your business! Items once sold can be exchanged within 7 days.'
  });

  const [smsLogs, setSmsLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  // Test SMS State & Templates
  const SMS_TEMPLATES = [
    {
      id: 'offers',
      name: '🎁 Festival & Exclusive Offers',
      template: (biz) =>
        `🎉 Special Offer from ${biz || 'Smart Electronics'}! Enjoy up to 25% OFF on 4K Smart TVs, Laptops & Smartphones. Visit our showroom today or call us for best exchange deals!`
    },
    {
      id: 'balance',
      name: '💳 Balance Payment Due Reminder',
      template: (biz) =>
        `Dear Customer, this is a gentle reminder regarding your pending balance with ${biz || 'Smart Electronics'}. Kindly clear the due amount at your earliest convenience via UPI or Cash. Thank you!`
    },
    {
      id: 'receipt',
      name: '🧾 Bill & Invoice Confirmation',
      template: (biz) =>
        `Hello! Thank you for purchasing at ${biz || 'Smart Electronics'}. Your bill invoice has been confirmed (PAID). Have a great day!`
    },
    {
      id: 'launch',
      name: '🚀 New Electronics Deals & Launches',
      template: (biz) =>
        `🚀 New Arrivals at ${biz || 'Smart Electronics'}! Latest Apple iPhone 15, MacBook Air M2 & Sony ANC Headphones in stock with 0% Easy EMI. Visit us today!`
    },
    {
      id: 'thank_you',
      name: '🙏 Customer Thank You Note',
      template: (biz) =>
        `Dear Customer, thank you for choosing ${biz || 'Smart Electronics'}! We deeply value your trust and look forward to serving you again.`
    },
    {
      id: 'custom',
      name: '✍️ Custom Message',
      template: (biz) => `Hello from ${biz || 'Smart Electronics'}! `
    }
  ];

  const [testPhone, setTestPhone] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('offers');
  const [testMessage, setTestMessage] = useState('🎉 Special Offer from Smart Electronics! Enjoy up to 25% OFF on 4K Smart TVs, Laptops & Smartphones. Visit our showroom today or call us for best exchange deals!');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleResetStoreData = async () => {
    const confirmed = window.confirm(
      '⚠️ ARE YOU SURE YOU WANT TO RESET STORE DATA?\n\nThis will wipe all test customers, products, sales, invoices, suppliers, purchases, and expenses.\nYour business profile and login will remain safe.\n\nClick OK to proceed with a clean slate.'
    );
    if (!confirmed) return;

    setResetting(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await api.post('/business/reset-data');
      setSuccessMsg(res.data.message || 'Store data reset successfully!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to reset store data.');
    } finally {
      setResetting(false);
    }
  };

  const loadProfileAndLogs = async () => {
    setLoading(true);
    try {
      const [profRes, logsRes] = await Promise.all([
        api.get('/business/profile'),
        api.get('/sms/logs')
      ]);
      setProfile(profRes.data);
      setSmsLogs(logsRes.data || []);
      if (profRes.data?.businessName) {
        setTestMessage(
          `🎉 Special Offer from ${profRes.data.businessName}! Enjoy up to 25% OFF on 4K Smart TVs, Laptops & Smartphones. Visit our showroom today or call us for best exchange deals!`
        );
      }
    } catch (err) {
      setErrorMsg('Failed to load settings data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileAndLogs();
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.put('/business/profile', profile);
      setProfile(res.data);
      setSuccessMsg('Business settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    const tmpl = SMS_TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setTestMessage(tmpl.template(profile.businessName));
    }
  };

  const handleTestWhatsApp = () => {
    if (!testPhone) return;
    const clean = testPhone.replace(/\D/g, '');
    const phone = clean.length === 10 ? `91${clean}` : clean;
    const msgToSend = testMessage || `Hello from ${profile.businessName || 'Smart Electronics'}!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msgToSend)}`, '_blank');
  };

  const handleSendTestSMS = async (e) => {
    e.preventDefault();
    if (!testPhone || !testMessage.trim()) return;
    setTestSending(true);
    setTestResult(null);

    const cleanDigits = testPhone.replace(/\D/g, '');
    const formattedPhone = cleanDigits.length === 10 ? `+91${cleanDigits}` : (cleanDigits.startsWith('+') ? cleanDigits : `+${cleanDigits}`);
    const smsUri = `sms:${formattedPhone}?body=${encodeURIComponent(testMessage)}`;

    // 1. Trigger Windows Phone Link / Link to Windows / Messages App
    try {
      window.location.href = smsUri;
    } catch (err) {
      const a = document.createElement('a');
      a.href = smsUri;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    // 2. Log in backend database
    try {
      await api.post('/sms/send', {
        phone: testPhone,
        customerName: 'Test Recipient',
        message: testMessage,
        templateType: selectedTemplateId
      });
      setTestResult({
        type: 'success',
        message: `📱 Phone Link launched for ${formattedPhone} with [${SMS_TEMPLATES.find(t=>t.id===selectedTemplateId)?.name}] pre-filled. Just tap Send in your messaging app!`
      });
      const logsRes = await api.get('/sms/logs');
      setSmsLogs(logsRes.data || []);
    } catch (err) {
      setTestResult({
        type: 'success',
        message: `📱 Phone Link opened for ${formattedPhone}.`
      });
    } finally {
      setTestSending(false);
    }
  };

  if (loading) return <div className="page">Loading business settings...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Business Settings</h2>
          <p className="page-subtitle">Configure business profile, invoice branding, and 1-click SMS logs</p>
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

      {/* Tabs */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <Building2 size={16} /> Business Profile & Invoices
        </button>
        <button
          className={`tab-btn ${activeTab === 'sms' ? 'active' : ''}`}
          onClick={() => setActiveTab('sms')}
        >
          <MessageSquare size={16} /> 1-Click SMS Logs ({smsLogs.length})
        </button>
      </div>

      {activeTab === 'profile' && (
        <form className="settings-card" onSubmit={handleProfileSubmit}>
          <div className="settings-section">
            <h3>🏢 Company & Branding Details</h3>
            <p className="settings-subtext">These details appear directly on your downloadable PDF invoices and customer bills.</p>
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Business Name *</label>
                <input
                  type="text"
                  value={profile.businessName || ''}
                  onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Owner / Proprietor Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={profile.ownerName || ''}
                  onChange={(e) => setProfile({ ...profile, ownerName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Official Contact Mobile *</label>
                <input
                  type="text"
                  value={profile.mobile || ''}
                  onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  value={profile.email || ''}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Store / Office Address</label>
                <textarea
                  rows={2}
                  placeholder="Shop No., Street, City, State, Pincode"
                  value={profile.address || ''}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">GSTIN / Tax ID Number</label>
                <input
                  type="text"
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  value={profile.gstin || ''}
                  onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Currency Symbol</label>
                <select
                  value={profile.currency || '₹'}
                  onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
                >
                  <option value="₹">₹ - Indian Rupee (INR)</option>
                  <option value="$">$ - US Dollar (USD)</option>
                  <option value="€">€ - Euro (EUR)</option>
                  <option value="£">£ - British Pound (GBP)</option>
                  <option value="AED ">AED - UAE Dirham</option>
                  <option value="C$">C$ - Canadian Dollar</option>
                  <option value="A$">A$ - Australian Dollar</option>
                </select>
              </div>
            </div>
          </div>

          <div className="settings-section mt-4">
            <h3>🧾 Invoice & Billing Preferences</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Invoice Number Prefix</label>
                <input
                  type="text"
                  placeholder="e.g. INV, BILL, TX"
                  value={profile.invoicePrefix || 'INV'}
                  onChange={(e) => setProfile({ ...profile, invoicePrefix: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Business UPI ID (for QR Code on Bills)</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210@paytm, yourname@okaxis, shop@sbi"
                  value={profile.upiId || ''}
                  onChange={(e) => setProfile({ ...profile, upiId: e.target.value })}
                />
                <small className="muted" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
                  Must be your active registered UPI ID. UPI apps (PhonePe, GPay, Paytm) check this with the NPCI bank switch.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Thermal POS Receipt Roll Width</label>
                <select
                  value={profile.thermalPrintWidth || '80mm'}
                  onChange={(e) => setProfile({ ...profile, thermalPrintWidth: e.target.value })}
                >
                  <option value="80mm">80mm (Standard 3-inch POS Printer)</option>
                  <option value="58mm">58mm (Compact 2-inch Bluetooth/USB)</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label className="form-label">Default Terms & Invoice Footer Note</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Goods once sold cannot be returned. Thank you for your business!"
                  value={profile.invoiceNotes || ''}
                  onChange={(e) => setProfile({ ...profile, invoiceNotes: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-actions mt-4">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving Changes...' : 'Save Business Settings'}
            </button>
          </div>

          {/* Danger Zone: Clean Store Reset */}
          <div className="settings-section mt-5 pt-4" style={{ borderTop: '1.5px dashed #fecaca' }}>
            <div style={{
              background: '#fff5f5',
              border: '1.5px solid #fca5a5',
              borderRadius: '12px',
              padding: '18px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px'
            }}>
              <div>
                <h4 style={{ color: '#991b1b', margin: 0, fontSize: '0.98rem', fontWeight: 800 }}>
                  ⚠️ Store Data Reset (Clean Slate for Electronics Shop)
                </h4>
                <p style={{ color: '#b91c1c', margin: '4px 0 0 0', fontSize: '0.84rem' }}>
                  Wipes all mock customers, products, sales, invoices, suppliers, purchases, and expenses so you can start fresh. (Your login account & business settings will remain safe).
                </p>
              </div>
              <button
                type="button"
                className="btn btn-danger"
                style={{
                  background: 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)',
                  boxShadow: '0 3px 0 #991b1b',
                  fontWeight: 700
                }}
                disabled={resetting}
                onClick={handleResetStoreData}
              >
                <Trash2 size={15} /> {resetting ? 'Resetting Store...' : 'Reset All Store Data'}
              </button>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'sms' && (
        <div className="settings-card">
          <div className="settings-section">
            <div className="section-title-badge">
              <Sparkles size={16} />
              <h3>1-Click Customer SMS & WhatsApp Service</h3>
            </div>
            <p className="settings-subtext">
              1-Click messaging is active to dispatch instant payment reminders, bill receipts, and customer notes directly to their phones.
            </p>

            {/* 1-Click Message Dispatcher Bench */}
            <div className="mt-3">
              <h4>1-Click Message Dispatcher</h4>
              <p className="settings-subtext">
                Select a message type below, preview or customize the text, and dispatch via Phone Link SMS or WhatsApp.
              </p>

              {/* Template Category Pills */}
              <div className="form-group mt-2">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  <Sparkles size={14} className="inline-icon" /> Choose Message Type / Template:
                </label>
                <div className="template-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                  {SMS_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`template-pill ${selectedTemplateId === t.id ? 'active' : ''}`}
                      onClick={() => handleTemplateSelect(t.id)}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Phone & Message Box */}
              <form onSubmit={handleSendTestSMS} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Recipient Mobile Number *</label>
                  <input
                    type="text"
                    placeholder="Enter 10-digit mobile number (e.g. 9867195957)"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    required
                    style={{ maxWidth: '380px', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                </div>

                <div className="form-group">
                  <div className="textarea-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Message Content (Editable):</label>
                    <span className="muted" style={{ fontSize: '0.78rem' }}>
                      {testMessage.length} characters • {Math.ceil(testMessage.length / 160) || 1} SMS part
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Type your SMS message..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      lineHeight: '1.4'
                    }}
                    required
                  />
                </div>

                {/* Dispatch Actions */}
                <div className="flex-align-gap" style={{ gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-success"
                    style={{ background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)', color: 'white', fontWeight: 700, padding: '10px 18px' }}
                    onClick={handleTestWhatsApp}
                    disabled={!testPhone || !testMessage.trim()}
                    title="Open directly in WhatsApp with message pre-filled"
                  >
                    <ExternalLink size={15} /> Send via WhatsApp (Live)
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '10px 18px', fontWeight: 700 }}
                    disabled={testSending || !testPhone || !testMessage.trim()}
                    title="Open Phone Link on your PC to send normal cellular SMS"
                  >
                    <Send size={15} /> {testSending ? 'Launching...' : 'Send SMS (Phone Link)'}
                  </button>
                </div>
              </form>

              {testResult && (
                <div className={`alert ${testResult.type === 'success' ? 'alert-success' : 'alert-error'} mt-3`}>
                  {testResult.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Telecom SMS Gateway Info Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 16px',
              marginTop: '16px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}>
              <strong style={{ color: 'var(--text)' }}>💡 Direct Phone Messaging Guide:</strong>
              <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                <li><strong>📱 Send SMS (Phone Link)</strong>: Launches Microsoft Phone Link on your PC with the recipient and message pre-typed to send as a normal SMS through your paired phone.</li>
                <li><strong>💬 Send via WhatsApp</strong>: Opens WhatsApp Web or App with the recipient and pre-filled offer / balance note for instant 100% free delivery.</li>
              </ul>
            </div>
          </div>

          {/* SMS Logs Table */}
          <div className="settings-section mt-4 border-top pt-4">
            <h3>Recent SMS Dispatch Logs ({smsLogs.length})</h3>
            <p className="settings-subtext">Complete delivery history for all 1-Click SMS sent from your business.</p>

            {smsLogs.length === 0 ? (
              <p className="muted mt-3">No SMS sent yet. Use the 1-Click SMS button in Customers or Billing to send one!</p>
            ) : (
              <div className="table-responsive mt-3">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Recipient</th>
                      <th>Phone</th>
                      <th>Message Text</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {smsLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{new Date(log.date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td><strong>{log.customerName}</strong></td>
                        <td>{log.phone}</td>
                        <td className="sms-msg-cell" title={log.message}>
                          {log.message.length > 50 ? `${log.message.slice(0, 50)}...` : log.message}
                        </td>
                        <td>
                          <span className="badge badge-success"><CheckCircle size={11} /> {log.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
