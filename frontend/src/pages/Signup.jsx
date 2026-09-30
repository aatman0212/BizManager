import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store,
  Building2,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Zap,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const [form, setForm] = useState({ businessName: '', email: '', password: '', mobile: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!/^\d{10}$/.test(form.mobile.replace(/\D/g, ''))) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      await signup(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Branding Showcase Hero */}
      <div className="auth-hero-panel">
        <div className="auth-hero-glow"></div>
        <div className="auth-hero-content">
          <div className="auth-brand-badge">
            <div className="brand-logo-icon">
              <Store size={22} />
            </div>
            <span className="brand-name">BizManager</span>
            <span className="brand-version">PRO</span>
          </div>

          <h1 className="auth-hero-title">
            Empower Your Business with Modern Records & Billing.
          </h1>
          <p className="auth-hero-subtitle">
            Get started in under 60 seconds. Set up your business profile, customize your invoice branding, and start issuing professional bills immediately.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <div className="feature-icon-wrap"><Zap size={16} /></div>
              <div>
                <strong>Zero Configuration Needed</strong>
                <p>Instant activation with full POS billing, inventory, and customer ledger.</p>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="feature-icon-wrap"><CheckCircle2 size={16} /></div>
              <div>
                <strong>1-Click Payment Reminders</strong>
                <p>Keep your cash flow healthy with instant SMS payment reminders.</p>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="feature-icon-wrap"><Sparkles size={16} /></div>
              <div>
                <strong>Downloadable PDF Invoices</strong>
                <p>Print or download customized tax invoices with business details & logo.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Signup Form Card */}
      <div className="auth-form-panel">
        <div className="auth-card-box">
          <div className="auth-header">
            <h2>Create Business Account</h2>
            <p>Register your store or company on BizManager</p>
          </div>

          {error && (
            <div className="alert alert-error auth-error-alert">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form-inputs">
            <div className="auth-field-group">
              <label className="auth-field-label">Business / Store Name *</label>
              <div className="auth-input-wrapper">
                <Building2 size={18} className="auth-input-icon-left" />
                <input
                  type="text"
                  className="auth-input-control"
                  value={form.businessName}
                  onChange={handleChange('businessName')}
                  placeholder="e.g. Apex Traders & Co."
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-field-label">Official Email Address *</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon-left" />
                <input
                  type="email"
                  className="auth-input-control"
                  value={form.email}
                  onChange={handleChange('email')}
                  placeholder="owner@business.com"
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-field-label">Contact Mobile Number (10 digits) *</label>
              <div className="auth-input-wrapper">
                <Phone size={18} className="auth-input-icon-left" />
                <input
                  type="tel"
                  className="auth-input-control"
                  value={form.mobile}
                  onChange={handleChange('mobile')}
                  placeholder="e.g. 9876543210"
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-field-label">Create Password (min 6 characters) *</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon-left" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input-control auth-input-with-toggle"
                  value={form.password}
                  onChange={handleChange('password')}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-auth-submit" disabled={loading}>
              {loading ? (
                <span className="btn-loading-dots">Setting up account...</span>
              ) : (
                <>
                  <span>Create Account & Get Started</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer-note">
            Already registered your business?{' '}
            <Link to="/login" className="auth-link-highlight">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
