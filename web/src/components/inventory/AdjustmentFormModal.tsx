'use client';

import { useState, useEffect, useId } from 'react';
import useSWR from 'swr';
import { fetcher, apiMutate, FetchError } from '@/lib/fetcher';
import { PickItem, PaginatedResponse } from './types';
import { useLocale } from '@/lib/i18n/LocaleContext';

interface AdjustmentFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AdjustmentFormModal({ onClose, onSuccess }: AdjustmentFormModalProps) {
  const { t } = useLocale();
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

  const base = useId();
  const qtyChangeId = `${base}-qtyChange`;
  const reasonId = `${base}-reason`;
  const customReasonId = `${base}-customReason`;
  const notesId = `${base}-notes`;

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
      setErrorMsg(t.inventory.selectItemFirst);
      return;
    }
    const numQty = Number(qtyChange);
    if (!numQty || numQty === 0) {
      setErrorMsg(t.inventory.qtyRequired);
      return;
    }

    const finalReason = reasonPreset === 'Lainnya' ? customReason : reasonPreset;
    if (!finalReason.trim()) {
      setErrorMsg(t.inventory.reasonRequired);
      return;
    }

    const payload = {
      item_id: Number(itemId),
      qty_change: numQty,
      reason: finalReason,
      notes: notes || undefined,
    };

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await apiMutate('/api/inventory/adjustments', 'POST', payload);
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof FetchError) {
        if (err.status === 401 || err.status === 403) {
          setErrorMsg(t.common.sessionInvalid);
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg(t.common.unknownError);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'oklch(20% 0.02 262 / 0.45)', display: 'grid', placeItems: 'center', padding: 'var(--space-4)', zIndex: 50 }}>
      <div className="card" style={{ width: 'min(100%, 500px)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, boxShadow: 'var(--shadow)' }}>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--color-accent)', margin: 0 }}>{t.inventory.stockAdjustment}</h2>
          <button type="button" className="btn btn--outline" onClick={onClose}>{t.common.close}</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {errorMsg && (
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-sm)' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{t.inventory.selectItem} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              {selectedItemName ? (
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <div className="input" style={{ flex: 1, background: 'var(--color-surface-2)' }}>{selectedItemName}</div>
                  <button type="button" className="btn btn--ghost" onClick={() => { setItemId(''); setSelectedItemName(''); }}>{t.common.change}</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder={t.inventory.searchItem}
                    aria-label={t.inventory.searchItemLabel}
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
                      {pickItems.length === 0 && <div style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-text-muted)' }}>{t.common.notFound}</div>}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor={qtyChangeId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{t.inventory.qtyChange} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input id={qtyChangeId} type="number" className="input" value={qtyChange} onChange={(e) => setQtyChange(e.target.value)} placeholder={t.inventory.qtyChangeExample} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor={reasonId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{t.inventory.reason} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <select id={reasonId} className="input" value={reasonPreset} onChange={(e) => setReasonPreset(e.target.value)} required>
                <option value="Stok Opname">{t.inventory.stockOpname}</option>
                <option value="Rusak">{t.inventory.damaged}</option>
                <option value="Hilang">{t.inventory.lost}</option>
                <option value="Koreksi">{t.inventory.correction}</option>
                <option value="Lainnya">{t.inventory.other}</option>
              </select>
              {reasonPreset === 'Lainnya' && (
                <input id={customReasonId} type="text" className="input" style={{ marginTop: 'var(--space-2)' }} value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder={t.inventory.writeReason} aria-label={t.inventory.otherReason} required />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor={notesId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{t.common.notes}</label>
              <input id={notesId} type="text" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.common.optional} />
            </div>
          </div>

          <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 'var(--space-3)' }}>
            <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={onClose}>{t.common.cancel}</button>
            <button type="submit" className="btn" style={{ flex: 1 }} disabled={isSubmitting}>
              {isSubmitting ? t.common.saving : t.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
