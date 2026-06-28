'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Check, Trash2 } from 'lucide-react';
import { fetcher, apiMutate, FetchError } from '@/lib/fetcher';
import { PurchaseOrder, FlatResponse } from './types';
import { formatIDRFromString } from '@/components/pos/format';
import { isAdmin } from '@/lib/roles';
import { PoFormModal } from './PoFormModal';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useLocale } from '@/lib/i18n/LocaleContext';

interface PurchaseOrdersTabProps {
  role: string;
}

export function PurchaseOrdersTab({ role }: PurchaseOrdersTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { t } = useLocale();

  const { data, error, isLoading, mutate } = useSWR<FlatResponse<PurchaseOrder>>('/api/inventory/purchase-orders', fetcher);
  const items = data?.data || [];

  const canWrite = isAdmin(role);

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
        {canWrite && (
          <button className="btn" onClick={() => setIsModalOpen(true)}>
            {t.inventory.createPo}
          </button>
        )}
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
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>{t.common.supplier}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>{t.inventory.createdBy}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{t.common.total}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>{t.common.status}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>{t.common.date}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)' }}>{row.po_number}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{row.suppliers?.name || '-'}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{row.users?.name || '-'}</td>
                  <td className="money" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{formatIDRFromString(row.total_amount)}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                    {row.status === 'pending' ? (
                      <span style={{ padding: 'var(--space-1) var(--space-2)', background: 'var(--color-warning)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>{t.inventory.pending}</span>
                    ) : (
                      <span style={{ padding: 'var(--space-1) var(--space-2)', background: 'var(--color-success)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>{t.inventory.received}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{new Date(row.created_at).toLocaleDateString('id-ID')}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                    {canWrite && row.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
                        <button className="hover:scale-110 transition-transform p-1 text-[var(--color-success)]" onClick={() => handleReceive(row.id)} title={t.inventory.receivePo}>
                          <Check size={18} />
                        </button>
                        <button className="hover:scale-110 transition-transform p-1 text-[var(--color-danger)]" onClick={() => handleDelete(row.id)} title={t.inventory.deletePo}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {t.inventory.noDataPo}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <PoFormModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            mutate();
          }}
        />
      )}
    </div>
  );
}
