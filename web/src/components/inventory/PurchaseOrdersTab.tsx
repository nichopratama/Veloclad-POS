'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher, apiMutate, FetchError } from '@/lib/fetcher';
import { Check, Trash2, Info, Edit } from 'lucide-react';
import { PurchaseOrder, FlatResponse } from './types';
import { formatIDRFromString } from '@/components/pos/format';
import { isAdmin } from '@/lib/roles';
import { PoFormModal } from './PoFormModal';
import { PoDetailModal } from './PoDetailModal';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useLocale } from '@/lib/i18n/LocaleContext';

interface PurchaseOrdersTabProps {
  role: string;
}

export function PurchaseOrdersTab({ role }: PurchaseOrdersTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [editPo, setEditPo] = useState<PurchaseOrder | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const { t } = useLocale();

  const { data, error, isLoading, mutate } = useSWR<FlatResponse<PurchaseOrder>>('/api/inventory/purchase-orders', fetcher);
  const items = data?.data || [];
  
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const canWrite = isAdmin(role);

  const methodLabel = (m: string | null) => {
    if (m === 'CASH') return t.inventory.typeCash;
    if (m === 'CREDIT') return t.inventory.typeCredit;
    if (m === 'CONSIGNMENT') return t.inventory.typeConsignment;
    return '-';
  };
  // Consignment is paid per sold unit via the consignment-debt settlement flow, not
  // as a single PO invoice, so a PO-level PAID/UNPAID is meaningless and misleading.
  // Show a neutral "Consignment" badge; real payment status lives in Consignment Debt.
  const payStatusLabel = (s: string | null, method: string | null) => {
    if (method === 'CONSIGNMENT') return t.inventory.payStatusConsignment;
    if (s === 'PAID') return t.inventory.payStatusPaid;
    if (s === 'PARTIAL') return t.inventory.payStatusPartial;
    return t.inventory.payStatusUnpaid;
  };
  const payStatusColor = (s: string | null, method: string | null) => {
    if (method === 'CONSIGNMENT') return 'var(--color-text-muted)';
    return s === 'PAID' ? 'var(--color-success)' : s === 'PARTIAL' ? '#f59e0b' : 'var(--color-danger)';
  };

  const handleReceive = async (poId: number) => {
    if (!confirm(t.inventory.confirmReceivePo)) return;
    setErrorMsg('');
    try {
      await apiMutate(`/api/inventory/purchase-orders/${poId}/receive`, 'PATCH');
      mutate();
    } catch (err: unknown) {
      if (err instanceof FetchError) {
        if (err.status === 401 || err.status === 403) {
          setErrorMsg(t.common.accessDenied);
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg(t.common.unknownError);
      }
    }
  };

  const handleApprove = async (poId: number) => {
    if (!confirm('Setujui PO ini? Pastikan harga sudah benar.')) return;
    setErrorMsg('');
    try {
      await apiMutate(`/api/inventory/purchase-orders/${poId}/approve`, 'PATCH');
      mutate();
    } catch (err: unknown) {
      if (err instanceof FetchError) {
        if (err.status === 401 || err.status === 403) {
          setErrorMsg(t.common.accessDenied);
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg(t.common.unknownError);
      }
    }
  };

  const handleDelete = async (poId: number) => {
    if (!confirm(t.inventory.confirmDeletePo)) return;
    setErrorMsg('');
    try {
      await apiMutate(`/api/inventory/purchase-orders/${poId}`, 'DELETE');
      mutate();
    } catch (err: unknown) {
      if (err instanceof FetchError) {
        if (err.status === 401 || err.status === 403) {
          setErrorMsg(t.common.accessDenied);
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg(t.common.unknownError);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: '100%' }}>
      {errorMsg && (
        <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0 var(--space-2)' }}>✕</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn" onClick={() => setIsModalOpen(true)}>
          {t.inventory.createPo}
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {error ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-danger)' }}>
            {t.common.loadError}: {error instanceof Error ? error.message : t.common.unknownError}
          </div>
        ) : isLoading ? (
          <SkeletonRows rows={8} cols={5} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>{t.inventory.poNumber}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>{t.common.date}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>{t.common.supplier}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>{t.inventory.createdBy}</th>
                {canWrite && <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{t.common.total}</th>}
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>{t.inventory.payment}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>{t.common.status}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)' }}>{row.po_number}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{new Date(row.created_at).toLocaleDateString('id-ID')}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{row.suppliers?.name || '-'}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{row.users?.name || '-'}</td>
                  {canWrite && <td className="money" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{formatIDRFromString(row.total_amount)}</td>}
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: 'var(--space-2)', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>{methodLabel(row.payment_method)}</span>
                      <span style={{ padding: '2px var(--space-2)', background: payStatusColor(row.payment_status, row.payment_method), color: 'white', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>{payStatusLabel(row.payment_status, row.payment_method)}</span>
                    </div>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                    {row.status === 'needs_approval' ? (
                      <span style={{ padding: 'var(--space-1) var(--space-2)', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>Approval</span>
                    ) : row.status === 'pending' ? (
                      <span style={{ padding: 'var(--space-1) var(--space-2)', background: 'var(--color-warning)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>{t.inventory.pending}</span>
                    ) : (
                      <span style={{ padding: 'var(--space-1) var(--space-2)', background: 'var(--color-success)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>{t.inventory.received}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
                      <button className="hover:scale-110 transition-transform p-1 text-[var(--color-accent)]" onClick={() => setSelectedPo(row)} title={t.sales.detail || 'Detail'}>
                        <Info size={18} />
                      </button>
                      {canWrite && (
                        <>
                          <button
                            className={`transition-transform p-1 ${row.status !== 'received' ? 'hover:scale-110' : ''}`}
                            style={{
                              color: row.status !== 'received' ? 'var(--color-text)' : 'var(--color-text-muted)',
                              cursor: row.status !== 'received' ? 'pointer' : 'not-allowed',
                              opacity: row.status !== 'received' ? 1 : 0.5
                            }}
                            onClick={() => row.status !== 'received' && setEditPo(row)}
                            title="Edit"
                            disabled={row.status === 'received'}
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            className={`transition-transform p-1 ${row.status !== 'received' ? 'hover:scale-110' : ''}`}
                            style={{
                              color: row.status === 'pending' ? 'var(--color-success)' : row.status === 'needs_approval' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                              cursor: row.status !== 'received' ? 'pointer' : 'not-allowed',
                              opacity: row.status !== 'received' ? 1 : 0.5
                            }}
                            onClick={() => {
                              if (row.status === 'needs_approval') handleApprove(row.id);
                              else if (row.status === 'pending') handleReceive(row.id);
                            }}
                            title={row.status === 'needs_approval' ? 'Approve PO' : row.status === 'pending' ? t.inventory.receivePo : 'Status pesanan ini sudah selesai'}
                            disabled={row.status === 'received'}
                          >
                            <Check size={18} />
                          </button>
                          <button
                            className={`transition-transform p-1 ${row.status !== 'received' ? 'hover:scale-110' : ''}`}
                            style={{
                              color: row.status !== 'received' ? 'var(--color-danger)' : 'var(--color-text-muted)',
                              cursor: row.status !== 'received' ? 'pointer' : 'not-allowed',
                              opacity: row.status !== 'received' ? 1 : 0.5
                            }}
                            onClick={() => row.status !== 'received' && handleDelete(row.id)}
                            title={row.status !== 'received' ? t.inventory.deletePo : 'Status pesanan ini sudah selesai'}
                            disabled={row.status === 'received'}
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {t.inventory.noDataPo}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        
        {!isLoading && !error && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Menampilkan {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, items.length)} dari {items.length} data
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                className="btn btn--ghost"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{ padding: 'var(--space-1) var(--space-3)' }}
              >
                Prev
              </button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                {currentPage} / {totalPages}
              </span>
              <button
                className="btn btn--ghost"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{ padding: 'var(--space-1) var(--space-3)' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <PoFormModal
          role={role}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            mutate();
          }}
        />
      )}

      {editPo && (
        <PoFormModal
          role={role}
          initialData={editPo}
          onClose={() => setEditPo(null)}
          onSuccess={() => {
            setEditPo(null);
            mutate();
          }}
        />
      )}

      {selectedPo && (
        <PoDetailModal
          role={role}
          po={selectedPo}
          onClose={() => setSelectedPo(null)}
        />
      )}
    </div>
  );
}
