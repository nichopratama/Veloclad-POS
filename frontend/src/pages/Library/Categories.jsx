import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, X, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Categories = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`/api/library/categories?search=${search}`);
      setCategories(res.data);
    } catch (error) {
      console.error('Failed to load categories', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCategories();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus kategori ini?')) {
      try {
        await axios.delete(`/api/library/categories/${id}`);
        fetchCategories();
      } catch (error) {
        alert('Gagal menghapus kategori');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleEdit = (category) => {
    setFormData({
      name: category.name || '',
      description: category.description || ''
    });
    setEditId(category.id);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setFormData({ name: '', description: '' });
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!formData.name) {
        alert('Nama Kategori wajib diisi');
        setIsSubmitting(false);
        return;
      }

      if (editId) {
        await axios.put(`/api/library/categories/${editId}`, formData);
      } else {
        await axios.post('/api/library/categories', formData);
      }
      
      setIsModalOpen(false);
      setEditId(null);
      setFormData({ name: '', description: '' });
      fetchCategories();
    } catch (error) {
      console.error('Failed to save category', error);
      alert('Gagal menyimpan kategori');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card list-card">
      <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{t('Categories', 'Daftar Kategori')}</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="pos-search" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} className="search-icon" style={{ position: 'absolute', left: '10px', color: '#64748B' }} />
            <input 
              type="text" 
              placeholder={t('Search', 'Cari kategori...')} 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '32px', width: '250px' }}
            />
          </div>
          <button className="btn btn-primary" onClick={openNewModal}>
            <Plus size={16} /> Tambah Kategori
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
                <th>ID</th>
                <th>Nama Kategori</th>
                <th>Deskripsi</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center empty-state">Belum ada kategori.</td>
                </tr>
              ) : (
                categories.map(category => (
                  <tr key={category.id}>
                    <td>{category.id}</td>
                    <td>{category.name}</td>
                    <td>{category.description || '-'}</td>
                    <td className="text-right row-actions">
                      <button className="action-btn edit-btn" onClick={() => handleEdit(category)}><Edit size={16} /></button>
                      <button className="action-btn delete-btn" onClick={() => handleDelete(category.id)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah/Edit Kategori */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editId ? t('Edit', 'Edit Kategori') : 'Tambah Kategori'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nama Kategori *</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="form-control" />
              </div>
              <div className="form-group">
                <label>Deskripsi</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} className="form-control" rows="3"></textarea>
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

export default Categories;
