'use client';

import { useState, useEffect, useId } from 'react';
import useSWR from 'swr';
import { fetcher, apiMutate, FetchError } from '@/lib/fetcher';
import { StoreSettings } from './types';
import { Skeleton } from '@/components/ui/Skeleton';

interface SettingsFormProps {
  role: string;
}

export function SettingsForm({ role }: SettingsFormProps) {
  const { data, error, isLoading, mutate } = useSWR<StoreSettings>('/api/settings/store', fetcher);

  const [formData, setFormData] = useState<StoreSettings>({
    store_name: '',
    address: '',
    phone: '',
    email: '',
    tax_rate: 0,
    is_tax_active: false,
    receipt_footer: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const canWrite = role === 'owner' || role === 'admin';

  const storeNameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const addressId = useId();
  const taxRateId = useId();
  const receiptFooterId = useId();

  useEffect(() => {
    if (data) {
      setFormData({
        store_name: data.store_name ?? '',
        address: data.address ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        tax_rate: data.tax_rate ?? 0,
        is_tax_active: data.is_tax_active ?? false,
        receipt_footer: data.receipt_footer ?? '',
      });
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;

    setErrorMsg('');
    setSuccessMsg('');

    if (formData.tax_rate < 0 || formData.tax_rate > 100) {
      setErrorMsg('Tarif pajak harus antara 0 dan 100.');
      return;
    }

    const payload = {
      store_name: formData.store_name,
      address: formData.address || null,
      phone: formData.phone || null,
      email: formData.email ? formData.email : null,
      tax_rate: Number(formData.tax_rate),
      is_tax_active: formData.is_tax_active,
      receipt_footer: formData.receipt_footer || null,
    };

    setIsSubmitting(true);

    try {
      await apiMutate('/api/settings/store', 'PUT', payload);
      setSuccessMsg('Pengaturan berhasil disimpan.');
      mutate();
    } catch (err: unknown) {
      if (err instanceof FetchError) {
        if (err.status === 401 || err.status === 403) {
          setErrorMsg('Sesi tidak valid / akses ditolak.');
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg('Terjadi kesalahan yang tidak diketahui.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof StoreSettings, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (error) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-danger)' }}>
        Gagal memuat pengaturan: {error instanceof Error ? error.message : 'Error tidak diketahui'}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        {['sec1', 'sec2', 'sec3'].map((sk) => (
          <div key={sk} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Skeleton width={160} height={16} style={{ marginBottom: 'var(--space-2)' }} />
            {['f1', 'f2', 'f3'].map((fk) => (
              <div key={fk} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <Skeleton width={120} height={12} />
                <Skeleton width="100%" height={36} />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      
      {successMsg && (
        <div style={{ padding: 'var(--space-4)', background: 'var(--color-success)', color: 'white', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg('')} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0 var(--space-2)', fontSize: 'var(--text-lg)' }}>✕</button>
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0 var(--space-2)', fontSize: 'var(--text-lg)' }}>✕</button>
        </div>
      )}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>Identitas Toko</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <label htmlFor={storeNameId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Nama Toko <span style={{ color: 'var(--color-danger)' }}>*</span></label>
          <input
            id={storeNameId}
            type="text"
            className="input"
            value={formData.store_name}
            onChange={(e) => handleChange('store_name', e.target.value)}
            required
            disabled={!canWrite}
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: '1 1 250px' }}>
            <label htmlFor={phoneId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Telepon</label>
            <input
              id={phoneId}
              type="text"
              className="input"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              disabled={!canWrite}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: '1 1 250px' }}>
            <label htmlFor={emailId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Email</label>
            <input
              id={emailId}
              type="email"
              className="input"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={!canWrite}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <label htmlFor={addressId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Alamat</label>
          <textarea
            id={addressId}
            className="input"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            style={{ minHeight: '80px', paddingTop: 'var(--space-2)' }}
            disabled={!canWrite}
          />
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>Pajak (PPN)</h2>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: canWrite ? 'pointer' : 'default', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
          <input
            type="checkbox"
            checked={formData.is_tax_active}
            onChange={(e) => handleChange('is_tax_active', e.target.checked)}
            disabled={!canWrite}
          />
          Aktifkan Pajak (PPN) pada Transaksi Penjualan
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <label htmlFor={taxRateId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Tarif Pajak (%) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
          <input
            id={taxRateId}
            type="number"
            className="input"
            value={formData.tax_rate}
            onChange={(e) => handleChange('tax_rate', e.target.value === '' ? 0 : Number(e.target.value))}
            required
            min="0"
            max="100"
            step="0.01"
            disabled={!canWrite}
            style={{ maxWidth: '200px' }}
          />
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>Footer Struk</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <label htmlFor={receiptFooterId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Pesan Penutup di Struk</label>
          <textarea
            id={receiptFooterId}
            className="input"
            value={formData.receipt_footer}
            onChange={(e) => handleChange('receipt_footer', e.target.value)}
            placeholder="Misal: Terima kasih telah berbelanja!"
            style={{ minHeight: '80px', paddingTop: 'var(--space-2)' }}
            disabled={!canWrite}
          />
        </div>
      </div>

      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
          <button type="submit" className="btn" disabled={isSubmitting} style={{ padding: 'var(--space-3) var(--space-6)' }}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      )}
    </form>
  );
}
