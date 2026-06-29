import { useState, useEffect, useId } from 'react';
import useSWR from 'swr';
import { fetcher, apiMutate, FetchError } from '@/lib/fetcher';
import { Supplier, PickItem, PaginatedResponse, FlatResponse } from './types';
import { formatIDRFromString } from '@/components/pos/format';
import { useLocale } from '@/lib/i18n/LocaleContext';

interface PoFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function PoFormModal({ onClose, onSuccess }: PoFormModalProps) {
  const { t } = useLocale();
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CREDIT' | 'CONSIGNMENT'>('CASH');
  const [dueDate, setDueDate] = useState('');

  const [items, setItems] = useState<{ id: string; item_id: string; item_name: string; qty: string; cost: string }[]>([]);

  const [itemSearch, setItemSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const base = useId();
  const supplierFieldId = `${base}-supplier`;
  const notesFieldId = `${base}-notes`;
  const paymentMethodFieldId = `${base}-payment`;
  const dueDateFieldId = `${base}-due-date`;

  const { data: supData } = useSWR<FlatResponse<Supplier>>('/api/library/suppliers', fetcher);
  const suppliers = supData?.data || [];

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(itemSearch), 300);
    return () => clearTimeout(timer);
  }, [itemSearch]);

  const itemQuery = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}&limit=10` : `?limit=10`;
  const { data: itemData } = useSWR<PaginatedResponse<PickItem>>(`/api/library/items${itemQuery}`, fetcher);
  const pickItems = itemData?.data || [];

  const handleAddItem = (pickItem: PickItem) => {
    setItems(prev => [
      ...prev,
      { id: Math.random().toString(), item_id: String(pickItem.id), item_name: pickItem.name, qty: '1', cost: '0' },
    ]);
    setItemSearch('');
  };

  const updateItem = (id: string, field: 'qty' | 'cost', value: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const previewTotal = items.reduce((sum, it) => {
    const q = Number(it.qty) || 0;
    const c = Number(it.cost) || 0;
    return sum + (q * c);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setErrorMsg(t.common.supplier + ' ' + t.common.optional);
      return;
    }
    if (items.length === 0) {
      setErrorMsg(t.inventory.noItemAdded);
      return;
    }
    if (paymentMethod === 'CREDIT' && !dueDate) {
      setErrorMsg('Tanggal Jatuh Tempo wajib diisi untuk mekanisme pembayaran jatuh tempo (CREDIT).');
      return;
    }

    const payload = {
      supplier_id: Number(supplierId),
      notes: notes || undefined,
      payment_method: paymentMethod,
      due_date: paymentMethod === 'CREDIT' ? (new Date(dueDate).toISOString()) : undefined,
      items: items.map(it => ({
        item_id: Number(it.item_id),
        qty: Number(it.qty),
        cost: Number(it.cost),
      })),
    };

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await apiMutate('/api/inventory/purchase-orders', 'POST', payload);
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
      <div className="card" style={{ width: 'min(100%, 700px)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, boxShadow: 'var(--shadow)' }}>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>{t.inventory.createPurchaseOrder}</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose} style={{ minHeight: '32px', padding: '0 var(--space-2)' }}>{t.common.close}</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {errorMsg && (
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-sm)' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label htmlFor={supplierFieldId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{t.common.supplier} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <select id={supplierFieldId} className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                  <option value="" disabled>- {t.common.supplier} -</option>
                  {suppliers.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label htmlFor={notesFieldId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{t.inventory.additionalNotes}</label>
                <input id={notesFieldId} type="text" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.common.optional} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label htmlFor={paymentMethodFieldId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Tipe Pembelian</label>
                <select id={paymentMethodFieldId} className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'CREDIT' | 'CONSIGNMENT')} required>
                  <option value="CASH">Lunas (Tunai)</option>
                  <option value="CREDIT">Jatuh Tempo (Hutang)</option>
                  <option value="CONSIGNMENT">Konsinyasi (Titipan)</option>
                </select>
              </div>
              {paymentMethod === 'CREDIT' ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <label htmlFor={dueDateFieldId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Jatuh Tempo <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <input id={dueDateFieldId} type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
                </div>
              ) : (
                <div style={{ flex: 1 }} />
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', margin: 'var(--space-2) 0', paddingTop: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>{t.inventory.poItems}</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                <input
                  type="text"
                  className="input"
                  placeholder={t.inventory.searchItemPo}
                  aria-label={t.inventory.searchItemPoLabel}
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
                {itemSearch && (
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', maxHeight: '150px', overflowY: 'auto' }}>
                    {pickItems.map(p => (
                      <div key={p.id} onClick={() => handleAddItem(p)} style={{ padding: 'var(--space-2) var(--space-3)', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', marginRight: 'var(--space-2)' }}>{p.code}</span>
                        {p.name}
                      </div>
                    ))}
                    {pickItems.length === 0 && <div style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-text-muted)' }}>{t.inventory.noItemFound}</div>}
                  </div>
                )}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', fontSize: 'var(--text-sm)' }}>
                    <th style={{ padding: 'var(--space-2) 0' }}>{t.common.name}</th>
                    <th style={{ padding: 'var(--space-2) 0', width: '80px' }}>{t.common.quantity}</th>
                    <th style={{ padding: 'var(--space-2) 0', width: '150px' }}>{t.inventory.unitPrice}</th>
                    <th style={{ padding: 'var(--space-2) 0', width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: 'var(--space-2) 0' }}>{it.item_name}</td>
                      <td style={{ padding: 'var(--space-2) var(--space-2) var(--space-2) 0' }}>
                        <input type="number" className="input" value={it.qty} onChange={(e) => updateItem(it.id, 'qty', e.target.value)} required min="1" aria-label={`Qty ${it.item_name}`} style={{ padding: 'var(--space-1) var(--space-2)' }} />
                      </td>
                      <td style={{ padding: 'var(--space-2) var(--space-2) var(--space-2) 0' }}>
                        <input
                          type="text"
                          className="input"
                          value={it.cost ? Number(it.cost).toLocaleString('id-ID') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            updateItem(it.id, 'cost', raw);
                          }}
                          required
                          aria-label={`${t.inventory.unitPrice} ${it.item_name}`}
                          style={{ padding: 'var(--space-1) var(--space-2)' }}
                        />
                      </td>
                      <td style={{ padding: 'var(--space-2) 0', textAlign: 'right' }}>
                        <button type="button" onClick={() => removeItem(it.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: 'var(--space-4) 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>{t.inventory.noItemAdded}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)', fontSize: 'var(--text-lg)' }}>
                <strong>{t.inventory.estimatedTotal} <span className="money">{formatIDRFromString(String(previewTotal))}</span></strong>
              </div>
            </div>
          </div>

          <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 'var(--space-3)' }}>
            <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={onClose}>{t.common.cancel}</button>
            <button type="submit" className="btn" style={{ flex: 1 }} disabled={isSubmitting}>
              {isSubmitting ? t.common.saving : t.inventory.savePo}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
