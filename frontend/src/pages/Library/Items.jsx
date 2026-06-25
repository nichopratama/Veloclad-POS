import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, X, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Library.css';

const Items = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category_id: '',
    supplier_id: '',
    price: 0,
    hpp: 0,
    stock: 0,
    min_stock: 0,
    unit: 'pcs',
    is_active: true
  });

  const fetchData = async () => {
    setLoading(true);
    
    // Load categories independently
    try {
      const resCat = await axios.get('/api/library/categories');
      setCategories(Array.isArray(resCat.data) ? resCat.data : (resCat.data?.data || []));
    } catch (e) { console.error('Failed to load categories', e); }

    // Load suppliers independently
    try {
      const resSup = await axios.get('/api/library/suppliers');
      setSuppliers(Array.isArray(resSup.data) ? resSup.data : (resSup.data?.data || []));
    } catch (e) { console.error('Failed to load suppliers', e); }

    // Load items
    try {
      const resItems = await axios.get(`/api/library/items?page=${page}&limit=${limit}&search=${search}`);
      setItems(resItems.data.data || resItems.data);
      if (resItems.data.pagination) {
        setTotalPages(resItems.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to load items', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [page, search]);

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus produk ini?')) {
      try {
        await axios.delete(`/api/library/items/${id}`);
        fetchData();
      } catch (error) {
        alert('Gagal menghapus produk');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return '0';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleCurrencyChange = (e, field) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numValue = rawValue ? parseInt(rawValue, 10) : 0;
    setFormData({
      ...formData,
      [field]: numValue
    });
  };

  const handleEdit = (item) => {
    setFormData({
      code: item.code || '',
      name: item.name || '',
      category_id: item.category_id || '',
      supplier_id: item.supplier_id || '',
      price: item.price || 0,
      hpp: item.hpp || 0,
      stock: item.stock || 0,
      min_stock: item.min_stock || 0,
      unit: item.unit || 'pcs',
      is_active: item.is_active !== undefined ? item.is_active : true
    });
    setEditId(item.id);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setFormData({
      code: '', name: '', category_id: '', supplier_id: '', 
      price: 0, hpp: 0, stock: 0, min_stock: 0, unit: 'pcs', is_active: true
    });
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      if (!payload.category_id) payload.category_id = null;
      if (!payload.supplier_id) payload.supplier_id = null;
      
      // Basic validation
      if (!payload.code || !payload.name) {
        alert('Kode dan Nama Produk wajib diisi');
        setIsSubmitting(false);
        return;
      }

      if (editId) {
        await axios.put(`/api/library/items/${editId}`, payload);
      } else {
        await axios.post('/api/library/items', payload);
      }
      
      setIsModalOpen(false);
      setEditId(null);
      setFormData({
        code: '', name: '', category_id: '', supplier_id: '', 
        price: 0, hpp: 0, stock: 0, min_stock: 0, unit: 'pcs', is_active: true
      });
      fetchData();
    } catch (error) {
      console.error('Failed to save item', error);
      alert('Gagal menyimpan produk: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="card list-card">
      <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{t('Product List', 'Daftar Produk')}</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
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
          <button className="btn btn-primary" onClick={openNewModal}>
            <Plus size={16} /> {t('Add Product', 'Tambah Produk')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">{t('Loading...', 'Memuat data...')}</div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('Code', 'Kode')}</th>
                <th>{t('Product Name', 'Nama Produk')}</th>
                <th>{t('Category', 'Kategori')}</th>
                <th>{t('Selling Price', 'Harga Jual')}</th>
                <th>{t('Current Stock', 'Stok')}</th>
                <th>{t('Status', 'Status')}</th>
                <th className="text-right">{t('Action', 'Aksi')}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center empty-state">{t('No data', 'Belum ada produk.')}</td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td>{item.category_name || '-'}</td>
                    <td>{formatRupiah(item.price)}</td>
                    <td>{item.stock} {item.unit}</td>
                    <td>
                      <span className={`badge ${item.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {item.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="text-right row-actions">
                      <button className="action-btn edit-btn" onClick={() => handleEdit(item)}><Edit size={16} /></button>
                      <button className="action-btn delete-btn" onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>
                    </td>
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

      {/* Modal Tambah Produk */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editId ? 'Edit Produk' : 'Tambah Produk Baru'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Kode Produk (SKU) *</label>
                <input type="text" name="code" value={formData.code} onChange={handleInputChange} required className="form-control" />
              </div>
              <div className="form-group">
                <label>Nama Produk *</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="form-control" />
              </div>
              <div className="form-group">
                <label>Kategori</label>
                <select name="category_id" value={formData.category_id} onChange={handleInputChange} className="form-control">
                  <option value="">Pilih Kategori...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Harga Modal (HPP)</label>
                  <input 
                    type="text" 
                    name="hpp" 
                    value={formatCurrency(formData.hpp)} 
                    onChange={(e) => handleCurrencyChange(e, 'hpp')} 
                    className="form-control" 
                  />
                </div>
                <div className="form-group">
                  <label>Harga Jual *</label>
                  <input 
                    type="text" 
                    name="price" 
                    value={formatCurrency(formData.price)} 
                    onChange={(e) => handleCurrencyChange(e, 'price')} 
                    required 
                    className="form-control" 
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Stok Awal</label>
                  <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} className="form-control" />
                </div>
                <div className="form-group">
                  <label>Stok Minimum</label>
                  <input type="number" name="min_stock" value={formData.min_stock} onChange={handleInputChange} className="form-control" />
                </div>
                <div className="form-group">
                  <label>Satuan (Unit)</label>
                  <input type="text" name="unit" value={formData.unit} onChange={handleInputChange} className="form-control" />
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Items;
