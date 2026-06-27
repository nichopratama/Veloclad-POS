'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Adjustment, FlatResponse } from './types';
import { AdjustmentFormModal } from './AdjustmentFormModal';
import { isAdmin } from '@/lib/roles';
import { SkeletonRows } from '@/components/ui/Skeleton';

interface AdjustmentsTabProps {
  role: string;
}

export function AdjustmentsTab({ role }: AdjustmentsTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<FlatResponse<Adjustment>>('/api/inventory/adjustments', fetcher);
  const items = data?.data || [];

  const canWrite = isAdmin(role);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {canWrite && (
          <button className="btn" onClick={() => setIsModalOpen(true)}>
            + Penyesuaian
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {error ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-danger)' }}>
            Gagal memuat data: {error instanceof Error ? error.message : 'Error tidak diketahui'}
          </div>
        ) : isLoading ? (
          <SkeletonRows rows={8} cols={5} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Item</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>Perubahan Qty</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Alasan</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Catatan</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Oleh</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const isPositive = row.qty_change > 0;
                const isNegative = row.qty_change < 0;
                
                let qtyColor = 'inherit';
                let qtySign = '';
                if (isPositive) { qtyColor = 'var(--color-success)'; qtySign = '+'; }
                if (isNegative) { qtyColor = 'var(--color-danger)'; }

                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{row.items?.name || '-'}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', color: qtyColor, fontWeight: 700 }}>
                      {qtySign}{row.qty_change}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{row.reason}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-muted)' }}>{row.notes || '-'}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{row.users?.name || '-'}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{new Date(row.created_at).toLocaleDateString('id-ID')}</td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Belum ada penyesuaian stok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <AdjustmentFormModal
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
