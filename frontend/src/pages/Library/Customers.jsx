import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, X, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Customers = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    points: 0
  });

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`/api/library/customers?search=${search}`);
      setCustomers(res.data);
    } catch (error) {
      console.error('Failed to load customers', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus pelanggan ini?')) {
      try {
        await axios.delete(`/api/library/customers/${id}`);
        fetchCustomers();
      } catch (error) {
        alert('Gagal menghapus pelanggan');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleEdit = (customer) => {
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      points: customer.points || 0
    });
    setEditId(customer.id);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setFormData({ name: '', phone: '', email: '', address: '', points: 0 });
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!formData.name) {
        alert('Nama Pelanggan wajib diisi');
        setIsSubmitting(false);
        return;
      }

      if (editId) {
        await axios.put(`/api/library/customers/${editId}`, formData);
      } else {
        await axios.post('/api/library/customers', formData);
      }
      
      setIsModalOpen(false);
      setEditId(null);
      setFormData({ name: '', phone: '', email: '', address: '', points: 0 });
      fetchCustomers();
    } catch (error) {
      console.error('Failed to save customer', error);
      alert('Gagal menyimpan pelanggan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card list-card">
      <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{t('Customers', 'Daftar Pelanggan')}</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="pos-search" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} className="search-icon" style={{ position: 'absolute', left: '10px', color: '#64748B' }} />
            <input 
              type="text" 
              placeholder={t('Search', 'Cari pelanggan...')} 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '32px', width: '250px' }}
            />
          </div>
          <button className="btn btn-primary" onClick={openNewModal}>
            <Plus size={16} /> Tambah Pelanggan
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
                <th>Nama Pelanggan</th>
                <th>Telepon</th>
                <th>Email</th>
                <th>Poin</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center empty-state">Belum ada pelanggan.</td>
                </tr>
              ) : (
                customers.map(customer => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.phone || '-'}</td>
                    <td>{customer.email || '-'}</td>
                    <td>{customer.points}</td>
                    <td className="text-right row-actions">
                      <button className="action-btn edit-btn" onClick={() => handleEdit(customer)}><Edit size={16} /></button>
                      <button className="action-btn delete-btn" onClick={() => handleDelete(customer.id)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah/Edit Pelanggan */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editId ? t('Edit', 'Edit Pelanggan') : 'Tambah Pelanggan'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nama Pelanggan *</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="form-control" />
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
                <textarea name="address" value={formData.address} onChange={handleInputChange} className="form-control" rows="3"></textarea>
              </div>
              <div className="form-group">
                <label>Poin Pelanggan</label>
                <input type="number" name="points" value={formData.points} onChange={handleInputChange} className="form-control" />
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

export default Customers;
