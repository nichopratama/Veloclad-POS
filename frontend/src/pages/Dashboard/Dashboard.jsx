import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import { DollarSign, ShoppingBag, Package, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Dashboard.css';

const Dashboard = () => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState({ totalSales: 0, transactionCount: 0, totalItems: 0 });
  const [salesData, setSalesData] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [topItemsPeriod, setTopItemsPeriod] = useState('today');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [summaryRes, chartRes] = await Promise.all([
          axios.get('/api/dashboard/summary'),
          axios.get('/api/dashboard/sales-chart')
        ]);
        
        setSummary(summaryRes.data);
        setSalesData(chartRes.data);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    const fetchTopItems = async () => {
      try {
        const res = await axios.get(`/api/dashboard/top-items?period=${topItemsPeriod}`);
        setTopItems(res.data);
      } catch (e) {
        console.error('Failed to load top items', e);
      }
    };
    fetchTopItems();
  }, [topItemsPeriod]);

  if (loading) {
    return <div className="loading-state">{t('Loading...')}</div>;
  }

  // Helper untuk format Rupiah
  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>{t('Dashboard')} {t('Overview')}</h1>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="card summary-card">
          <div className="summary-icon bg-primary-light">
            <DollarSign className="text-primary" />
          </div>
          <div className="summary-info">
            <p className="summary-label">{t('Today Revenue')}</p>
            <h3 className="summary-value">{formatRupiah(summary.totalSales)}</h3>
          </div>
        </div>
        <div className="card summary-card">
          <div className="summary-icon bg-success-light">
            <ShoppingBag className="text-success" />
          </div>
          <div className="summary-info">
            <p className="summary-label">{t('Total Transactions')}</p>
            <h3 className="summary-value">{summary.transactionCount}</h3>
          </div>
        </div>
        <div className="card summary-card">
          <div className="summary-icon bg-secondary-light">
            <Package className="text-secondary" />
          </div>
          <div className="summary-info">
            <p className="summary-label">{t('Active Products')}</p>
            <h3 className="summary-value">{summary.totalItems}</h3>
          </div>
        </div>
        <div className="card summary-card">
          <div className="summary-icon bg-warning-light">
            <TrendingUp className="text-warning" />
          </div>
          <div className="summary-info">
            <p className="summary-label">{t('Avg Transaction')}</p>
            <h3 className="summary-value">
              {summary.transactionCount > 0 
                ? formatRupiah(summary.totalSales / summary.transactionCount)
                : formatRupiah(0)}
            </h3>
          </div>
        </div>
      </div>

      {/* Charts & Tables */}
      <div className="dashboard-content-grid">
        <div className="card chart-card">
          <h2>{t('Sales Trend')}</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis 
                  tickFormatter={(value) => `Rp${value / 1000}k`} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  formatter={(value) => [formatRupiah(value), "Penjualan"]} 
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="var(--color-success)" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: "var(--color-success)" }}
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card top-items-card">
          <div className="top-items-header">
            <h2>{t('Top Selling Products')}</h2>
            <div className="top-items-tabs">
              <button 
                className={`tab-btn ${topItemsPeriod === 'today' ? 'active' : ''}`}
                onClick={() => setTopItemsPeriod('today')}
              >
                {t('Today', 'Today')}
              </button>
              <button 
                className={`tab-btn ${topItemsPeriod === 'month' ? 'active' : ''}`}
                onClick={() => setTopItemsPeriod('month')}
              >
                {t('This Month', 'This Month')}
              </button>
            </div>
          </div>
          <div className="top-items-list">
            {topItems.map((item, index) => (
              <div key={index} className="top-item-row">
                <div className="top-item-info">
                  <div className="top-item-rank">{index + 1}</div>
                  <div>
                    <div className="top-item-name">{item.name}</div>
                    <div className="top-item-qty">{item.qty} {t('Sold', 'terjual')}</div>
                  </div>
                </div>
                <div className="top-item-revenue">{formatRupiah(item.revenue)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
