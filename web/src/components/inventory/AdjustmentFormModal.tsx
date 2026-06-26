import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher, apiMutate, FetchError } from '@/lib/fetcher';
import { PickItem, PaginatedResponse } from './types';

interface AdjustmentFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AdjustmentFormModal({ onClose, onSuccess }: AdjustmentFormModalProps) {
  const [itemId, setItemId] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('');

  const [qtyChange, setQtyChange] = useState('');
  const [reasonPreset, setReasonPreset] = useState('Stok Opname');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(itemSearch), 300);
    return () => clearTimeout(timer);
  }, [itemSearch]);

  const itemQuery = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}&limit=10` : `?limit=10`;
  const { data: itemData } = useSWR<PaginatedResponse<PickItem>>(`/api/library/items${itemQuery}`, fetcher);
  const pickItems = itemData?.data || [];

  const handleSelectItem = (item: PickItem) => {
    setItemId(String(item.id));
    setSelectedItemName(`${item.code} - ${item.name}`);
    setItemSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) {
      setErrorMsg('Pilih item terlebih dahulu.');
      return;
    }
    const numQty = Number(qtyChange);
    if (!numQty || numQty === 0) {
      setErrorMsg('Perubahan stok (Qty) tidak boleh 0 atau kosong.');
      return;
    }
    
    const finalReason = reasonPreset === 'Lainnya' ? customReason : reasonPreset;
    if (!finalReason.trim()) {
      setErrorMsg('Alasan harus diisi.');
      return;
    }

    const payload = {
      item_id: Number(itemId),
      qty_change: numQty,
      reason: finalReason,
      notes: notes || undefined
    };

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await apiMutate('/api/inventory/adjustments', 'POST', payload);
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof FetchError) {
        if (err.status === 401 || err.status === 403) {
          setErrorMsg('Sesi tidak valid / akses ditolak');
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg('Terjadi kesalahan yang tidak diketahui');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'oklch(20% 0.02 262 / 0.45)', display: 'grid', placeItems: 'center', padding: 'var(--space-4)', zIndex: 50 }}>
      <div className="card" style={{ width: 'min(100%, 500px)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, boxShadow: 'var(--shadow)' }}>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>Penyesuaian Stok</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose} style={{ minHeight: '32px', padding: '0 var(--space-2)' }}>Tutup</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {errorMsg && (
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-sm)' }}>
                {errorMsg}
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Pilih Item <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              {selectedItemName ? (
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <div className="input" style={{ flex: 1, background: 'var(--color-surface-2)' }}>{selectedItemName}</div>
                  <button type="button" className="btn btn--ghost" onClick={() => { setItemId(''); setSelectedItemName(''); }}>Ubah</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Cari kode/nama item..." 
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                  />
                  {itemSearch && (
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', maxHeight: '150px', overflowY: 'auto' }}>
                      {pickItems.map(p => (
                        <div key={p.id} onClick={() => handleSelectItem(p)} style={{ padding: 'var(--space-2) var(--space-3)', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', marginRight: 'var(--space-2)' }}>{p.code}</span>
                          {p.name}
                        </div>
                      ))}
                      {pickItems.length === 0 && <div style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-text-muted)' }}>Tidak ditemukan</div>}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Perubahan Stok (+ / -) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input type="number" className="input" value={qtyChange} onChange={(e) => setQtyChange(e.target.value)} placeholder="Contoh: 5 atau -3" required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Alasan <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <select className="input" value={reasonPreset} onChange={(e) => setReasonPreset(e.target.value)} required>
                <option value="Stok Opname">Stok Opname</option>
                <option value="Rusak">Rusak</option>
                <option value="Hilang">Hilang</option>
                <option value="Koreksi">Koreksi</option>
                <option value="Lainnya">Lainnya...</option>
              </select>
              {reasonPreset === 'Lainnya' && (
                <input type="text" className="input" style={{ marginTop: 'var(--space-2)' }} value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder="Tulis alasan..." required />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Catatan</label>
              <input type="text" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" />
            </div>

          </div>

          <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 'var(--space-3)' }}>
            <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={onClose}>Batal</button>
            <button type="submit" className="btn" style={{ flex: 1 }} disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
