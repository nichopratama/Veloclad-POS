import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, ArrowDown, ArrowUp, Search } from 'lucide-react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../Library/Library.css'; // Reuse CSS dari Library

const StockSummary = () => {
  const { t } = useTranslation();
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Search states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchStockSummary();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [page, search]);

  const fetchStockSummary = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/inventory/stock-summary?page=${page}&limit=${limit}&search=${search}`);
      setStockData(res.data.data || res.data); // Support format lama dan baru
      if (res.data.pagination) {
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to load stock summary', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (stock, min_stock) => {
    if (stock <= 0) return <span className="badge badge-danger">{t('Out of Stock', 'Habis')}</span>;
    if (stock <= min_stock) return <span className="badge" style={{backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B'}}>{t('Low Stock', 'Menipis')}</span>;
    return <span className="badge badge-success">{t('Safe', 'Aman')}</span>;
  };

  return (
    <div className="card list-card">
      <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{t('Stock Summary', 'Ringkasan Stok Produk')}</h2>
        <div className="pos-search" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={16} className="search-icon" style={{ position: 'absolute', left: '10px', color: '#64748B' }} />
          <input 
            type="text" 
            placeholder={t('Search product...', 'Cari produk...')} 
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="form-control"
            style={{ paddingLeft: '32px', width: '250px' }}
          />
        </div>
      </div>
      
      {loading ? (
        <div className="loading-state">{t('Loading...', 'Memuat data stok...')}</div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('Code', 'Kode')}</th>
                <th>{t('Product Name', 'Nama Produk')}</th>
                <th>{t('Category', 'Kategori')}</th>
                <th>{t('Supplier', 'Supplier')}</th>
                <th>{t('Current Stock', 'Stok Saat Ini')}</th>
                <th>{t('Minimum Stock', 'Stok Minimum')}</th>
                <th>{t('Status', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {stockData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center empty-state">{t('No data', 'Belum ada data stok.')}</td>
                </tr>
              ) : (
                stockData.map(item => (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td>{item.category_name || '-'}</td>
                    <td>{item.supplier_name || '-'}</td>
                    <td style={{fontWeight: 600}}>{item.stock} {item.unit}</td>
                    <td>{item.min_stock} {item.unit}</td>
                    <td>{getStockStatus(item.stock, item.min_stock)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '0 10px' }}>
          <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Halaman {page} dari {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary" 
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              style={{ padding: '6px 12px', fontSize: '14px' }}
            >
              Sebelumnya
            </button>
            <button 
              className="btn btn-primary" 
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              style={{ padding: '6px 12px', fontSize: '14px' }}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const PurchaseOrder = () => (
  <div className="card">
    <div className="empty-state text-center" style={{padding: '40px'}}>
      <Package size={48} style={{margin: '0 auto', color: 'var(--color-text-disabled)'}} />
      <h3>Purchase Order</h3>
      <p>Fitur Purchase Order akan segera hadir di modul ini.</p>
    </div>
  </div>
);

const StockAdjustment = () => (
  <div className="card">
    <div className="empty-state text-center" style={{padding: '40px'}}>
      <div style={{display: 'flex', justifyContent: 'center', gap: '8px', color: 'var(--color-text-disabled)'}}>
        <ArrowUp size={32} />
        <ArrowDown size={32} />
      </div>
      <h3 style={{marginTop: '16px'}}>Penyesuaian Stok</h3>
      <p>Fitur Adjustment (Opname) akan segera hadir di modul ini.</p>
    </div>
  </div>
);

const Inventory = () => {
  return (
    <div className="library-container">
      <div className="library-header">
        <h1>Inventory</h1>
        <p>Kelola persediaan barang dan supplier Anda.</p>
      </div>

      <div className="library-content">
        <Routes>
          <Route path="/" element={<Navigate to="summary" replace />} />
          <Route path="summary" element={<StockSummary />} />
          <Route path="po" element={<PurchaseOrder />} />
          <Route path="adjustment" element={<StockAdjustment />} />
        </Routes>
      </div>
    </div>
  );
};

export default Inventory;
