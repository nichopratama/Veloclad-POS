import { useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Store, Receipt, Settings as SettingsIcon } from 'lucide-react';
import '../Library/Library.css';

const Settings = () => {
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const activeTab = pathParts[pathParts.length - 1] === 'settings' ? 'store' : pathParts[pathParts.length - 1];
  const [storeData, setStoreData] = useState({
    store_name: '',
    address: '',
    phone: '',
    email: '',
    tax_rate: 11,
    is_tax_active: true,
    receipt_footer: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/api/settings/store');
        if (res.data.store_name) {
          setStoreData(res.data);
        }
      } catch (error) {
        console.error('Failed to load settings', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStoreData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put('/api/settings/store', storeData);
      alert('Pengaturan berhasil disimpan!');
    } catch (error) {
      alert('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="library-container">
      <div className="library-header">
        <h1>Pengaturan Sistem</h1>
        <p>Kelola profil toko, pajak, dan cetak struk.</p>
      </div>

      {location.pathname === '/settings' || location.pathname === '/settings/' ? <Navigate to="/settings/store" replace /> : null}

      <div className="library-content">
        <div className="card" style={{ maxWidth: '600px' }}>
          {loading ? (
            <div className="loading-state">Memuat pengaturan...</div>
          ) : (
            <form onSubmit={handleSave}>
              {activeTab === 'store' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <h2>Profil Toko</h2>
                  <div className="form-group">
                    <label style={{display:'block', marginBottom:'4px'}}>Nama Toko (Tenant ID)</label>
                    <input 
                      type="text" name="store_name" value={storeData.store_name} 
                      disabled className="form-control" style={{width:'100%', padding:'8px', backgroundColor: '#F1F5F9', color: '#64748B', cursor: 'not-allowed', border: '1px solid #E2E8F0'}}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{display:'block', marginBottom:'4px'}}>Alamat Lengkap</label>
                    <textarea 
                      name="address" value={storeData.address} onChange={handleChange} 
                      className="form-control" rows="3" style={{width:'100%', padding:'8px'}}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{display:'block', marginBottom:'4px'}}>Nomor Telepon</label>
                    <input 
                      type="text" name="phone" value={storeData.phone} onChange={handleChange} 
                      className="form-control" style={{width:'100%', padding:'8px'}}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{display:'block', marginBottom:'4px'}}>Email Operasional</label>
                    <input 
                      type="email" name="email" value={storeData.email} onChange={handleChange} 
                      className="form-control" style={{width:'100%', padding:'8px'}}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'receipt' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <h2>Pajak & Struk</h2>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px' }}>
                    <div className="form-group" style={{ flex: 'none' }}>
                      <label style={{display:'block', marginBottom:'4px'}}>Pajak PPN (%)</label>
                      <input 
                        type="number" name="tax_rate" value={storeData.tax_rate} onChange={handleChange} 
                        className="form-control" style={{width:'100px', padding:'8px', backgroundColor: storeData.is_tax_active ? '#fff' : '#f1f5f9'}} 
                        min="0" max="100" disabled={!storeData.is_tax_active}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
                      <input 
                        type="checkbox" 
                        name="is_tax_active" 
                        checked={storeData.is_tax_active} 
                        onChange={(e) => setStoreData(prev => ({ ...prev, is_tax_active: e.target.checked }))} 
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        id="tax-toggle"
                      />
                      <label htmlFor="tax-toggle" style={{ margin: 0, cursor: 'pointer', fontWeight: '500' }}>Aktifkan Perhitungan Pajak</label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{display:'block', marginBottom:'4px'}}>Catatan Kaki Struk (Footer)</label>
                    <textarea 
                      name="receipt_footer" value={storeData.receipt_footer} onChange={handleChange} 
                      className="form-control" rows="4" style={{width:'100%', padding:'8px'}}
                      placeholder="Terima kasih atas kunjungan Anda..."
                    />
                  </div>
                </div>
              )}

              {activeTab === 'system' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <h2>Sistem</h2>
                  <p style={{color: 'var(--color-text-secondary)'}}>Pengaturan integrasi dan sistem lanjutan akan hadir di update berikutnya.</p>
                </div>
              )}

              <div style={{ marginTop: 'var(--spacing-xl)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-lg)' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
