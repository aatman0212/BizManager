import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Receipt,
  History,
  Settings as SettingsIcon,
  LogOut,
  Store,
  AlertTriangle,
  Truck,
  TrendingDown,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Sidebar() {
  const { businessName, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    // Fetch quick stats for badges
    api
      .get('/sales/dashboard/stats')
      .then((res) => {
        if (res.data?.lowStockCount !== undefined) {
          setLowStockCount(res.data.lowStockCount);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determine exact active states based on path and query parameters
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab');

  const isDashboardActive = location.pathname === '/';
  const isPosActive = location.pathname === '/sales' && currentTab !== 'history';
  const isHistoryActive = location.pathname === '/sales' && currentTab === 'history';
  const isProductsActive = location.pathname === '/products';
  const isSuppliersActive = location.pathname === '/suppliers';
  const isCustomersActive = location.pathname === '/customers';
  const isExpensesActive = location.pathname === '/expenses';
  const isReportsActive = location.pathname === '/reports';
  const isSettingsActive = location.pathname === '/settings';

  const linkClass = (isActive) => 'sidebar-link' + (isActive ? ' active' : '');

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo-icon">
          <Store size={22} />
        </div>
        <div className="brand-text">
          <span className="brand-title">BizManager</span>
          <span className="brand-badge">PRO</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">MAIN</div>
        <Link to="/" className={linkClass(isDashboardActive)}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </Link>

        <Link to="/sales" className={linkClass(isPosActive)}>
          <Receipt size={18} />
          <span>POS & Billing</span>
        </Link>

        <Link to="/sales?tab=history" className={linkClass(isHistoryActive)}>
          <History size={18} />
          <span>Selling History</span>
        </Link>

        <div className="nav-section-label">MANAGEMENT</div>
        <Link to="/products" className={linkClass(isProductsActive)}>
          <Package size={18} />
          <span>Stock / Inventory</span>
          {lowStockCount > 0 && (
            <span className="sidebar-badge-warning" title={`${lowStockCount} items at low stock`}>
              <AlertTriangle size={11} /> {lowStockCount}
            </span>
          )}
        </Link>

        <Link to="/suppliers" className={linkClass(isSuppliersActive)}>
          <Truck size={18} />
          <span>Suppliers & PO</span>
        </Link>

        <Link to="/customers" className={linkClass(isCustomersActive)}>
          <Users size={18} />
          <span>Customers & SMS</span>
        </Link>

        <div className="nav-section-label">FINANCIALS</div>
        <Link to="/expenses" className={linkClass(isExpensesActive)}>
          <TrendingDown size={18} />
          <span>Expense Tracker</span>
        </Link>

        <Link to="/reports" className={linkClass(isReportsActive)}>
          <BarChart3 size={18} />
          <span>Reports & P&L</span>
        </Link>

        <div className="nav-section-label">PREFERENCES</div>
        <Link to="/settings" className={linkClass(isSettingsActive)}>
          <SettingsIcon size={18} />
          <span>Business Settings</span>
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-business">
          <div className="sidebar-business-avatar">{businessName?.charAt(0).toUpperCase() || 'B'}</div>
          <div className="sidebar-business-meta">
            <div className="sidebar-business-name" title={businessName}>{businessName}</div>
            <div className="sidebar-business-plan">Active Account</div>
          </div>
        </div>
        <button onClick={handleLogout} className="sidebar-logout" title="Sign out of BizManager">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
