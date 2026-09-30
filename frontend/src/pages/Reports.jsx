import { useState, useEffect } from 'react';
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Upload,
  Database,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';
import api from '../api';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('pnl'); // 'pnl' | 'gst' | 'backup'
  const [loading, setLoading] = useState(true);
  const [pnlData, setPnlData] = useState({});
  const [gstData, setGstData] = useState({ summary: {}, taxSlabs: {}, invoices: [] });
  const [dateRange, setDateRange] = useState('ALL'); // 'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS'
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // CSV Import State
  const [importType, setImportType] = useState('products');
  const [importing, setImporting] = useState(false);

  // Restore State
  const [restoring, setRestoring] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      let params = {};
      if (dateRange === 'THIS_MONTH') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        params = { startDate: start };
      } else if (dateRange === 'LAST_30_DAYS') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        params = { startDate: thirtyDaysAgo.toISOString() };
      }

      const [pnlRes, gstRes] = await Promise.all([
        api.get('/reports/pnl', { params }),
        api.get('/reports/gst')
      ]);

      setPnlData(pnlRes.data || {});
      setGstData(gstRes.data || { summary: {}, taxSlabs: {}, invoices: [] });
    } catch (err) {
      setErrorMsg('Failed to load financial reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  // CSV Export Trigger
  const handleExportCSV = async (type) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reports/export/csv/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bizmanager-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setSuccessMsg(`Exported ${type}.csv successfully!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('Failed to export CSV.');
    }
  };

  // Full JSON Database Backup Download
  const handleDownloadBackup = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reports/backup', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bizmanager-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setSuccessMsg('Database backup downloaded successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('Failed to download database backup.');
    }
  };

  // Handle CSV Import File
  const handleCSVFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvData = event.target?.result;
        const res = await api.post(`/reports/import/csv/${importType}`, { csvData });
        setSuccessMsg(res.data.message || 'Import successful!');
        setTimeout(() => setSuccessMsg(''), 4000);
        loadReports();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to import CSV.');
      } finally {
        setImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Handle JSON Database Restore File
  const handleRestoreBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('WARNING: Restoring from backup will replace current business data with the backup contents. Proceed?')) {
      e.target.value = '';
      return;
    }

    setRestoring(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result);
        const res = await api.post('/reports/restore', { backup });
        setSuccessMsg(res.data.message || 'Database restored successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
        loadReports();
      } catch (err) {
        alert('Failed to restore backup. Invalid JSON file format.');
      } finally {
        setRestoring(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Financial Reports & Data Center</h2>
          <p className="page-subtitle">Profit & Loss analytics, GST tax ledger, Excel import/export, and database backups</p>
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
          className={`tab-btn ${activeTab === 'pnl' ? 'active' : ''}`}
          onClick={() => setActiveTab('pnl')}
        >
          <TrendingUp size={16} /> Profit & Loss (P&L) Statement
        </button>
        <button
          className={`tab-btn ${activeTab === 'gst' ? 'active' : ''}`}
          onClick={() => setActiveTab('gst')}
        >
          <FileText size={16} /> GST Tax Filing Reports
        </button>
        <button
          className={`tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          <Database size={16} /> Excel Import/Export & Backups
        </button>
      </div>

      {/* TAB 1: PROFIT & LOSS */}
      {activeTab === 'pnl' && (
        <div className="reports-pnl-panel">
          <div className="toolbar">
            <label className="form-label" style={{ margin: 0 }}>Filter Timeline:</label>
            <div className="filter-group">
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                <option value="ALL">All Time</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* P&L Metric Cards */}
          <div className="stat-grid mt-3">
            <div className="stat-card">
              <div className="stat-icon stat-icon-primary">
                <DollarSign size={22} />
              </div>
              <div>
                <div className="stat-label">Total Revenue (Gross Sales)</div>
                <div className="stat-value">₹{(pnlData.totalSalesRevenue || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-warning">
                <Layers size={22} />
              </div>
              <div>
                <div className="stat-label">Cost of Goods Sold (COGS)</div>
                <div className="stat-value">₹{(pnlData.totalCOGS || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-danger">
                <TrendingDown size={22} />
              </div>
              <div>
                <div className="stat-label">Operating Expenses</div>
                <div className="stat-value text-danger">₹{(pnlData.totalOperatingExpenses || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-primary">
                <TrendingUp size={22} />
              </div>
              <div>
                <div className="stat-label">Net Business Profit</div>
                <div className={`stat-value ${(pnlData.netProfit || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                  ₹{(pnlData.netProfit || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Financial Breakdown Table */}
          <div className="dashboard-section-card mt-4">
            <div className="dashboard-section-header">
              <h3>📈 Itemized Profit & Loss Ledger</h3>
              <span className="badge badge-primary">Net Profit Margin: {pnlData.profitMargin || 0}%</span>
            </div>

            <div className="table-responsive mt-3">
              <table className="data-table">
                <tbody>
                  <tr>
                    <td><strong>1. Total Sales Revenue (Gross Invoiced)</strong> (From {pnlData.invoiceCount || 0} Invoices)</td>
                    <td className="text-right font-bold text-success">₹{(pnlData.totalSalesRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td className="muted" style={{ paddingLeft: '28px' }}>Less: Cost of Goods Sold (Inventory Purchase Cost of Sold Stock)</td>
                    <td className="text-right text-danger">- ₹{(pnlData.totalCOGS || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr style={{ background: '#f8fafc' }}>
                    <td><strong>2. Gross Trading Margin / Profit (Sales Revenue − Inventory Cost)</strong></td>
                    <td className={`text-right font-bold ${(pnlData.grossProfit || 0) >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '1.05rem' }}>
                      ₹{(pnlData.grossProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="muted" style={{ paddingLeft: '28px' }}>Less: Total Operating Expenses ({pnlData.expenseCount || 0} Entries: Rent, Staff, Utilities)</td>
                    <td className="text-right text-danger">- ₹{(pnlData.totalOperatingExpenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr style={{ background: (pnlData.netProfit || 0) >= 0 ? '#f0fdf4' : '#fef2f2', borderTop: (pnlData.netProfit || 0) >= 0 ? '2px solid #86efac' : '2px solid #fca5a5' }}>
                    <td><strong style={{ fontSize: '1.05rem' }}>3. NET PROFIT / (LOSS)</strong></td>
                    <td className={`text-right font-bold ${(pnlData.netProfit || 0) >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '1.15rem' }}>
                      ₹{(pnlData.netProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GST & TAX REPORTS */}
      {activeTab === 'gst' && (
        <div className="reports-gst-panel">
          <div className="toolbar" style={{ justifyContent: 'space-between' }}>
            <p className="page-subtitle" style={{ margin: 0 }}>GSTR-1 & Taxable turnover summary grouped by tax slab.</p>
            <button className="btn btn-primary" onClick={() => handleExportCSV('sales')}>
              <Download size={16} /> Export Tax Ledger (CSV)
            </button>
          </div>

          <div className="stat-grid mt-3">
            <div className="stat-card">
              <div>
                <div className="stat-label">Total Taxable Value</div>
                <div className="stat-value">₹{(gstData.summary?.totalTaxableValue || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>
            <div className="stat-card">
              <div>
                <div className="stat-label">Total CGST (Central)</div>
                <div className="stat-value">₹{(gstData.summary?.totalCGST || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>
            <div className="stat-card">
              <div>
                <div className="stat-label">Total SGST (State)</div>
                <div className="stat-value">₹{(gstData.summary?.totalSGST || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>
            <div className="stat-card">
              <div>
                <div className="stat-label">Total GST Collected</div>
                <div className="stat-value text-success">₹{(gstData.summary?.grandTaxTotal || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* Tax Slab Summary Table */}
          <div className="dashboard-section-card mt-4">
            <h3>📊 Tax Slab Summary Breakdown</h3>
            <div className="table-responsive mt-3">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tax Slab Rate</th>
                    <th className="text-right">Invoices Count</th>
                    <th className="text-right">Taxable Turnover</th>
                    <th className="text-right">CGST</th>
                    <th className="text-right">SGST</th>
                    <th className="text-right">Total Tax Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(gstData.taxSlabs || {}).map((rate) => {
                    const slab = gstData.taxSlabs[rate];
                    return (
                      <tr key={rate}>
                        <td><strong>{rate} GST</strong></td>
                        <td className="text-right">{slab.count}</td>
                        <td className="text-right">₹{slab.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="text-right">₹{slab.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="text-right">₹{slab.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="text-right font-bold text-success">₹{slab.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BACKUP & DATA PORTABILITY */}
      {activeTab === 'backup' && (
        <div className="reports-backup-panel">
          <div className="charts-row">
            {/* 1-Click Excel / CSV Export Center */}
            <div className="chart-card">
              <div className="chart-header">
                <h3><FileSpreadsheet size={18} className="inline-icon" /> 1-Click Excel / CSV Export</h3>
              </div>
              <p className="settings-subtext">Download your complete data sets as formatted CSV spreadsheets compatible with MS Excel, Google Sheets, and Tally.</p>

              <div className="flex-align-gap" style={{ flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
                <button className="btn btn-outline" onClick={() => handleExportCSV('products')}>
                  <Download size={15} /> Export Products Catalog
                </button>
                <button className="btn btn-outline" onClick={() => handleExportCSV('customers')}>
                  <Download size={15} /> Export Customer Directory
                </button>
                <button className="btn btn-outline" onClick={() => handleExportCSV('sales')}>
                  <Download size={15} /> Export Sales Invoices
                </button>
                <button className="btn btn-outline" onClick={() => handleExportCSV('expenses')}>
                  <Download size={15} /> Export Expenses Ledger
                </button>
              </div>
            </div>

            {/* Bulk CSV Import Center */}
            <div className="chart-card">
              <div className="chart-header">
                <h3><Upload size={18} className="inline-icon" /> Bulk CSV Import</h3>
              </div>
              <p className="settings-subtext">Quickly import inventory products or customer contacts in bulk from a CSV spreadsheet.</p>

              <div className="form-group mt-3">
                <label className="form-label">Select Data Type to Import:</label>
                <select value={importType} onChange={(e) => setImportType(e.target.value)}>
                  <option value="products">Products (Name, SKU, Category, CostPrice, Price, Quantity)</option>
                  <option value="customers">Customers (Name, Phone, Email, Address, GSTIN)</option>
                </select>
              </div>

              <div className="form-group mt-3">
                <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                  <Upload size={16} /> {importing ? 'Importing CSV...' : 'Select CSV File to Upload'}
                  <input
                    type="file"
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={handleCSVFileUpload}
                    disabled={importing}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Full Database Backup & Restore */}
          <div className="dashboard-section-card mt-4">
            <div className="dashboard-section-header">
              <h3><Database size={18} className="inline-icon" /> Full Database Backup & Disaster Recovery</h3>
            </div>
            <p className="settings-subtext">
              Download an encrypted complete snapshot of your entire business database (Products, Invoices, Customers, Suppliers, Expenses, and Stock logs) or restore from an earlier backup.
            </p>

            <div className="flex-align-gap mt-3" style={{ gap: '14px' }}>
              <button className="btn btn-primary" onClick={handleDownloadBackup}>
                <Download size={16} /> Download Full Database Backup (.JSON)
              </button>

              <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                <Upload size={16} /> {restoring ? 'Restoring Database...' : 'Restore Database from JSON Backup'}
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleRestoreBackup}
                  disabled={restoring}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
