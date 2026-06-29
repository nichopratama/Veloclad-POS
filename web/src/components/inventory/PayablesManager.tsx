'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher, apiMutate, FetchError } from '@/lib/fetcher';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { formatIDR } from '@/components/pos/format';
import { useLocale } from '@/lib/i18n/LocaleContext';
import { toast } from '@/lib/toast';
import { isAdmin } from '@/lib/roles';

type ConsignmentSummaryRow = {
  supplier_id: number;
  supplier_name: string;
  unsettled_qty: number;
  unsettled_amount: number;
};

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
  const { data: consignData, mutate: mutateConsign } = useSWR<{ data: ConsignmentSummaryRow[] }>('/api/payables/settle-consignment', fetcher);
  const { t } = useLocale();

  const canWrite = isAdmin(role);

  const [paymentModal, setPaymentModal] = useState<PayableRow | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [settleModalOpen, setSettlementModalOpen] = useState(false);
  const [settleSupId, setSettleSupId] = useState('');
  const [settleDueDate, setSettleDueDate] = useState('');

  const payables = data?.data ?? [];
  const consignSummary = consignData?.data ?? [];
  const selectedConsign = consignSummary.find((c) => String(c.supplier_id) === settleSupId) ?? null;

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
      toast.success(t.payables.paySuccess);
      setPaymentModal(null);
      setPayAmount('');
      setPayNotes('');
      mutate();
    } catch (err: unknown) {
      toast.error(err instanceof FetchError ? err.message : t.payables.payError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Amount is computed server-side from unsettled consignment sales.
      await apiMutate('/api/payables/settle-consignment', 'POST', {
        supplier_id: Number(settleSupId),
        due_date: settleDueDate ? new Date(settleDueDate).toISOString() : undefined,
      });
      toast.success(t.payables.consignmentSuccess);
      setSettlementModalOpen(false);
      setSettleSupId('');
      setSettleDueDate('');
      mutate();
      mutateConsign();
    } catch (err: unknown) {
      toast.error(err instanceof FetchError ? err.message : t.payables.consignmentError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius)' }}>
        {t.payables.loadError}: {error.message}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button type="button" className="btn btn--outline" onClick={() => setSettlementModalOpen(true)}>
            {t.payables.calcConsignment}
          </button>
        </div>
      )}

      {isLoading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-alt)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left' }}>{t.common.supplier}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left' }}>{t.payables.poReference}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{t.payables.totalDebt}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{t.payables.paid}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>{t.payables.dueDate}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>{t.common.status}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {payables.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {t.payables.noPayables}
                  </td>
                </tr>
              ) : (
                payables.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <div style={{ fontWeight: 600 }}>{p.suppliers.name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{p.type}</div>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{p.purchase_orders?.po_number ?? '-'}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontWeight: 600 }}>{formatIDR(Number(p.total_debt))}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', color: 'var(--color-success)' }}>{formatIDR(Number(p.amount_paid))}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                      {p.due_date ? new Date(p.due_date).toLocaleDateString('id-ID') : '-'}
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
                      {canWrite && p.status !== 'PAID' && (
                        <button
                          type="button"
                          className="btn btn--outline"
                          style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-xs)' }}
                          onClick={() => setPaymentModal(p)}
                        >
                          {t.payables.pay}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Pembayaran */}
      {paymentModal && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
          <div className="card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{t.payables.payBill}</h3>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              {t.common.supplier}: <strong>{paymentModal.suppliers.name}</strong><br/>
              {t.payables.remainingDebt}: <strong>{formatIDR(Number(paymentModal.total_debt) - Number(paymentModal.amount_paid))}</strong>
            </div>
            <form onSubmit={handlePaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{t.payables.payAmount}</label>
                <input type="number" className="input" value={payAmount} onChange={e => setPayAmount(e.target.value)} required min={1} max={Number(paymentModal.total_debt) - Number(paymentModal.amount_paid)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{t.payables.paymentMethod}</label>
                <select className="input" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  <option value="CASH">{t.payables.methodCash}</option>
                  <option value="TRANSFER">{t.payables.methodTransfer}</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="submit" className="btn" style={{ flex: 1 }} disabled={isSubmitting}>{t.payables.confirmPay}</button>
                <button type="button" className="btn btn--outline" onClick={() => setPaymentModal(null)}>{t.common.cancel}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Settle Consignment */}
      {settleModalOpen && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
          <div className="card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{t.payables.recordConsignment}</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
              {t.payables.consignmentDesc}
            </p>
            {consignSummary.length === 0 ? (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>{t.payables.noUnsettledConsignment}</p>
            ) : (
              <form onSubmit={handleSettleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{t.common.supplier}</label>
                  <select className="input" value={settleSupId} onChange={e => setSettleSupId(e.target.value)} required>
                    <option value="">{t.payables.selectSupplier}</option>
                    {consignSummary.map((c) => (
                      <option key={c.supplier_id} value={String(c.supplier_id)}>
                        {c.supplier_name} — {c.unsettled_qty} {t.payables.qtySold.toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedConsign && (
                  <div style={{ background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{t.payables.computedDebt}</span>
                    <strong style={{ fontSize: 'var(--text-lg)' }}>{formatIDR(selectedConsign.unsettled_amount)}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{t.payables.dueDateOptional}</label>
                  <input type="date" className="input" value={settleDueDate} onChange={e => setSettleDueDate(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  <button type="submit" className="btn" style={{ flex: 1 }} disabled={isSubmitting || !selectedConsign}>{t.payables.createBill}</button>
                  <button type="button" className="btn btn--outline" onClick={() => setSettlementModalOpen(false)}>{t.common.cancel}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
