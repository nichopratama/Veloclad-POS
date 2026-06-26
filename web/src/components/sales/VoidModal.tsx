'use client';

import { useState } from 'react';
import { Transaction } from './types';
import { formatIDRFromString } from '@/components/pos/format';
import { apiMutate, FetchError } from '@/lib/fetcher';

interface VoidModalProps {
  transaction: Transaction;
  onClose: () => void;
  onSuccess: () => void;
}

export function VoidModal({ transaction, onClose, onSuccess }: VoidModalProps) {
  const [selectedItems, setSelectedItems] = useState<Record<number, { qty: number; refund_amount: number }>>({});
  const [reason, setReason] = useState('Returned Goods');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleToggleItem = (itemId: number, maxQty: number, defaultRefund: number) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[itemId]) {
        delete next[itemId];
      } else {
        next[itemId] = { qty: maxQty, refund_amount: defaultRefund };
      }
      return next;
    });
  };

  const handleQtyChange = (itemId: number, qtyStr: string, maxQty: number, unitPrice: number) => {
    let qty = parseInt(qtyStr, 10);
    if (isNaN(qty) || qty < 1) qty = 1;
    if (qty > maxQty) qty = maxQty;
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], qty, refund_amount: qty * unitPrice },
    }));
  };

  const handleRefundChange = (itemId: number, refundStr: string) => {
    let refund_amount = parseInt(refundStr, 10);
    if (isNaN(refund_amount) || refund_amount < 0) refund_amount = 0;
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], refund_amount },
    }));
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    const itemsPayload = Object.entries(selectedItems).map(([idStr, val]) => ({
      item_id: Number(idStr),
      qty: val.qty,
      refund_amount: val.refund_amount,
    }));

    if (itemsPayload.length === 0) {
      setErrorMsg('Pilih minimal satu item untuk di-void.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiMutate(`/api/sales/transactions/${transaction.id}/void`, 'POST', {
        items: itemsPayload,
        reason,
      });
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof FetchError && (err.status === 401 || err.status === 403)) {
        setErrorMsg('Sesi tidak valid / akses ditolak');
      } else if (err instanceof FetchError) {
        setErrorMsg(err.message || 'Gagal melakukan void');
      } else {
        setErrorMsg('Terjadi kesalahan tak terduga.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'oklch(20% 0.02 262 / 0.45)',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-4)',
        zIndex: 50,
      }}
    >
      <div
        className="card"
        style={{
          width: 'min(100%, 700px)',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>Void Transaksi: {transaction.id}</h2>
          <button className="btn btn--ghost" onClick={onClose} style={{ minHeight: '32px', padding: '0 var(--space-2)' }}>Batal</button>
        </div>

        {errorMsg && (
          <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-sm)' }}>
            {errorMsg}
          </div>
        )}

        <div>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Pilih Item</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: 'var(--space-2)' }}>Pilih</th>
                  <th style={{ padding: 'var(--space-2)' }}>Nama Item</th>
                  <th style={{ padding: 'var(--space-2)' }}>Harga Satuan</th>
                  <th style={{ padding: 'var(--space-2)' }}>Qty Asli</th>
                  <th style={{ padding: 'var(--space-2)' }}>Qty Void</th>
                  <th style={{ padding: 'var(--space-2)' }}>Nilai Refund</th>
                </tr>
              </thead>
              <tbody>
                {transaction.items_detail.map((item, idx) => {
                  const unitPrice = parseFloat(item.price) - (parseFloat(item.discount) / item.qty);
                  const isSelected = !!selectedItems[item.item_id];
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: 'var(--space-2)' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleItem(item.item_id, item.qty, Math.round(unitPrice * item.qty))}
                        />
                      </td>
                      <td style={{ padding: 'var(--space-2)' }}>{item.items.name}</td>
                      <td className="money" style={{ padding: 'var(--space-2)' }}>{formatIDRFromString(String(unitPrice))}</td>
                      <td style={{ padding: 'var(--space-2)' }}>{item.qty}</td>
                      <td style={{ padding: 'var(--space-2)' }}>
                        <input
                          type="number"
                          className="input"
                          min="1"
                          max={item.qty}
                          disabled={!isSelected}
                          value={selectedItems[item.item_id]?.qty || ''}
                          onChange={(e) => handleQtyChange(item.item_id, e.target.value, item.qty, unitPrice)}
                          style={{ minHeight: '32px', padding: '0 var(--space-2)', width: '60px' }}
                        />
                      </td>
                      <td style={{ padding: 'var(--space-2)' }}>
                        <input
                          type="number"
                          className="input"
                          min="0"
                          disabled={!isSelected}
                          value={selectedItems[item.item_id]?.refund_amount ?? ''}
                          onChange={(e) => handleRefundChange(item.item_id, e.target.value)}
                          style={{ minHeight: '32px', padding: '0 var(--space-2)', width: '120px' }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Alasan Void</label>
          <select
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="Returned Goods">Barang dikembalikan (Stok kembali)</option>
            <option value="Damaged Goods">Barang rusak/hilang (Stok tidak kembali)</option>
            <option value="Input Error">Salah input (Stok tidak kembali)</option>
            <option value="Other">Lainnya</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <button
            className="btn"
            style={{ flex: 1, background: 'var(--color-danger)' }}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Memproses...' : 'Proses Void'}
          </button>
        </div>
      </div>
    </div>
  );
}
