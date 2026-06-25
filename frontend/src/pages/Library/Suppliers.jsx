import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, X, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Suppliers = () => {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    npwp: '',
    is_active: true
  });

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(`/api/library/suppliers?search=${search}`);
      setSuppliers(res.data);
    } catch (error) {
      console.error('Failed to load suppliers', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSuppliers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus supplier ini?')) {
      try {
        await axios.delete(`/api/library/suppliers/${id}`);
        fetchSuppliers();
      } catch (error) {
        alert('Gagal menghapus supplier');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleEdit = (supplier) => {
    setFormData({
      name: supplier.name || '',
      contact: supplier.contact || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      npwp: supplier.npwp || '',
      is_active: supplier.is_active !== undefined ? supplier.is_active : true
    });
    setEditId(supplier.id);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setFormData({ name: '', contact: '', phone: '', email: '', address: '', npwp: '', is_active: true });
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!formData.name) {
        alert('Nama Perusahaan wajib diisi');
        setIsSubmitting(false);
        return;
      }

      if (editId) {
        await axios.put(`/api/library/suppliers/${editId}`, formData);
      } else {
        await axios.post('/api/library/suppliers', formData);
      }
      
      setIsModalOpen(false);
      setEditId(null);
      setFormData({ name: '', contact: '', phone: '', email: '', address: '', npwp: '', is_active: true });
      fetchSuppliers();
    } catch (error) {
      console.error('Failed to save supplier', error);
      alert('Gagal menyimpan supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card list-card">
      <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{t('Suppliers', 'Daftar Supplier')}</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="pos-search" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} className="search-icon" style={{ position: 'absolute', left: '10px', color: '#64748B' }} />
            <input 
              type="text" 
              placeholder={t('Search', 'Cari supplier...')} 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '32px', width: '250px' }}
            />
          </div>
          <button className="btn btn-primary" onClick={openNewModal}>
            <Plus size={16} /> Tambah Supplier
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Memuat data...</div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Supplier</th>
                <th>Kontak</th>
                <th>Telepon</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center empty-state">Belum ada supplier.</td>
                </tr>
              ) : (
                suppliers.map(supplier => (
                  <tr key={supplier.id}>
                    <td>{supplier.name}</td>
                    <td>{supplier.contact || '-'}</td>
                    <td>{supplier.phone || '-'}</td>
                    <td>
                      <span className={`badge ${supplier.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {supplier.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="text-right row-actions">
                      <button className="action-btn edit-btn" onClick={() => handleEdit(supplier)}><Edit size={16} /></button>
                      <button className="action-btn delete-btn" onClick={() => handleDelete(supplier.id)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah/Edit Supplier */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{editId ? t('Edit', 'Edit Supplier') : 'Tambah Supplier'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nama Perusahaan *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="form-control" />
                </div>
                <div className="form-group">
                  <label>Nama Kontak (PIC)</label>
                  <input type="text" name="contact" value={formData.contact} onChange={handleInputChange} className="form-control" />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Telepon</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="form-control" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="form-control" />
                </div>
              </div>
              
              <div className="form-group">
                <label>Alamat Lengkap</label>
                <textarea name="address" value={formData.address} onChange={handleInputChange} className="form-control" rows="2"></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>NPWP</label>
                  <input type="text" name="npwp" value={formData.npwp} onChange={handleInputChange} className="form-control" />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '28px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      name="is_active" 
                      checked={formData.is_active} 
                      onChange={handleInputChange} 
                      style={{ width: '18px', height: '18px' }}
                    />
                    Status Aktif
                  </label>
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>{t('Cancel', 'Batal')}</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? t('Loading...', 'Menyimpan...') : t('Save', 'Simpan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
