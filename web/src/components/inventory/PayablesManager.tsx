'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher, apiMutate, FetchError } from '@/lib/fetcher';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { formatIDR } from '@/components/pos/format';
import { useLocale } from '@/lib/i18n/LocaleContext';
import { toast } from '@/lib/toast';

type PayableRow = {
  id: number;
  supplier_id: number;
  po_id: number | null;
  type: string;
  total_debt: number | string;
  amount_paid: number | string;
  status: string;
  due_date: string | null;
  created_at: string;
  suppliers: { name: string; phone: string | null };
  purchase_orders: { po_number: string; payment_method: string } | null;
};

interface PayablesManagerProps {
  role: string;
}

export function PayablesManager({ role }: PayablesManagerProps) {
  const { data, error, isLoading, mutate } = useSWR<{ data: PayableRow[] }, FetchError>('/api/payables', fetcher);
  const { t } = useLocale();

  const [paymentModal, setPaymentModal] = useState<PayableRow | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [settleModalOpen, setSettlementModalOpen] = useState(false);
  const [settleSupId, setSettleSupId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleDueDate, setSettleDueDate] = useState('');

  const payables = data?.data ?? [];

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal) return;
    setIsSubmitting(true);
    try {
      await apiMutate(`/api/payables/${paymentModal.id}/pay`, 'POST', {
        amount: Number(payAmount),
        payment_method: payMethod,
        notes: payNotes || undefined,
      });
      toast.success('Pembayaran utang berhasil dicatat.');
      setPaymentModal(null);
      setPayAmount('');
      setPayNotes('');
      mutate();
    } catch (err: unknown) {
      toast.error(err instanceof FetchError ? err.message : 'Gagal mencatat pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiMutate('/api/payables/settle-consignment', 'POST', {
        supplier_id: Number(settleSupId),
        amount: Number(settleAmount),
        due_date: settleDueDate ? new Date(settleDueDate).toISOString() : undefined,
      });
      toast.success('Utang konsinyasi baru berhasil dicatat.');
      setSettlementModalOpen(false);
      setSettleSupId('');
      setSettleAmount('');
      setSettleDueDate('');
      mutate();
    } catch (err: unknown) {
      toast.error(err instanceof FetchError ? err.message : 'Gagal membuat tagihan konsinyasi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Kita perlu daftar unik supplier untuk settlement
  const suppliers = Array.from(new Map(payables.map(p => [p.supplier_id, p.suppliers.name])).entries());

  if (error) {
    return (
      <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius)' }}>
        Gagal memuat data payables: {error.message}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
        <button type="button" className="btn btn--outline" onClick={() => setSettlementModalOpen(true)}>
          Hitung Utang Konsinyasi
        </button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-alt)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left' }}>Supplier</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left' }}>Referensi PO</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>Total Tagihan</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>Sudah Dibayar</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>Jatuh Tempo</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>Status</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {payables.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Belum ada tagihan utang (Accounts Payable).
                  </td>
                </tr>
              ) : (
                payables.map((p) => {
                  const sisa = Number(p.total_debt) - Number(p.amount_paid);
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <div style={{ fontWeight: 600 }}>{p.suppliers.name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{p.type}</div>
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{p.purchase_orders?.po_number ?? '-'}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontWeight: 600 }}>{formatIDR(Number(p.total_debt))}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', color: 'var(--color-success)' }}>{formatIDR(Number(p.amount_paid))}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                        {p.due_date ? new Date(p.due_date).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: 'var(--space-1) var(--space-2)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          backgroundColor: p.status === 'PAID' ? 'var(--color-success)' : p.status === 'PARTIAL' ? '#f59e0b' : 'var(--color-danger)',
                          color: 'white'
                        }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                        {p.status !== 'PAID' && (
                          <button
                            type="button"
                            className="btn btn--outline"
                            style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-xs)' }}
                            onClick={() => setPaymentModal(p)}
                          >
                            Bayar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Pembayaran */}
      {paymentModal && (
        <div role="dialog" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
          <div className="card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Bayar Tagihan</h3>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Supplier: <strong>{paymentModal.suppliers.name}</strong><br/>
              Sisa Utang: <strong>{formatIDR(Number(paymentModal.total_debt) - Number(paymentModal.amount_paid))}</strong>
            </div>
            <form onSubmit={handlePaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Nominal Bayar (Rp)</label>
                <input type="number" className="input" value={payAmount} onChange={e => setPayAmount(e.target.value)} required min={1} max={Number(paymentModal.total_debt) - Number(paymentModal.amount_paid)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Metode Pembayaran</label>
                <select className="input" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  <option value="CASH">Tunai / Kasir</option>
                  <option value="TRANSFER">Transfer Bank</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="submit" className="btn" style={{ flex: 1 }} disabled={isSubmitting}>Konfirmasi Bayar</button>
                <button type="button" className="btn btn--outline" onClick={() => setPaymentModal(null)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Settle Consignment */}
      {settleModalOpen && (
        <div role="dialog" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
          <div className="card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Catat Utang Konsinyasi</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
              Buat tagihan baru berdasarkan jumlah barang titipan yang laku.
            </p>
            <form onSubmit={handleSettleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Supplier</label>
                <select className="input" value={settleSupId} onChange={e => setSettleSupId(e.target.value)} required>
                  <option value="">- Pilih Supplier -</option>
                  {suppliers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
                {suppliers.length === 0 && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>Belum ada data supplier pada payables saat ini. Anda dapat membuat form master terpisah jika butuh.</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Total Utang / Laku (Rp)</label>
                <input type="number" className="input" value={settleAmount} onChange={e => setSettleAmount(e.target.value)} required min={1} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Jatuh Tempo (Opsional)</label>
                <input type="date" className="input" value={settleDueDate} onChange={e => setSettleDueDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="submit" className="btn" style={{ flex: 1 }} disabled={isSubmitting}>Buat Tagihan</button>
                <button type="button" className="btn btn--outline" onClick={() => setSettlementModalOpen(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
