import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, Zap, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
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
            Smart Business Records & Billing Made Effortless.
          </h1>
          <p className="auth-hero-subtitle">
            Everything your business needs in one unified hub — customer CRM, real-time stock alerts, multi-item POS billing, instant PDF receipts, and 1-click SMS.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <div className="feature-icon-wrap"><Zap size={16} /></div>
              <div>
                <strong>Point of Sale & PDF Bills</strong>
                <p>Generate professional GST invoices and downloadable PDF receipts in seconds.</p>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="feature-icon-wrap"><CheckCircle2 size={16} /></div>
              <div>
                <strong>Inventory & Low Stock Alerts</strong>
                <p>Track stock levels with automatic deductions and real-time replenishment alerts.</p>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="feature-icon-wrap"><Sparkles size={16} /></div>
              <div>
                <strong>1-Click SMS Messaging</strong>
                <p>Send instant payment reminders & invoice summaries with one click.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Form Card */}
      <div className="auth-form-panel">
        <div className="auth-card-box">
          <div className="auth-header">
            <h2>Welcome Back</h2>
            <p>Log in to access your business workstation</p>
          </div>

          {error && (
            <div className="alert alert-error auth-error-alert">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form-inputs">
            <div className="auth-field-group">
              <label className="auth-field-label">Business Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon-left" />
                <input
                  type="email"
                  className="auth-input-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@business.com"
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-field-label">Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon-left" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input-control auth-input-with-toggle"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
                <span className="btn-loading-dots">Signing In...</span>
              ) : (
                <>
                  <span>Sign In to BizManager</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer-note">
            Don't have a business account?{' '}
            <Link to="/signup" className="auth-link-highlight">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
