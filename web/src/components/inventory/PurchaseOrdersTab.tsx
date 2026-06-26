'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher, apiMutate, FetchError } from '@/lib/fetcher';
import { PurchaseOrder, FlatResponse } from './types';
import { formatIDRFromString } from '@/components/pos/format';
import { PoFormModal } from './PoFormModal';

interface PurchaseOrdersTabProps {
  role: string;
}

export function PurchaseOrdersTab({ role }: PurchaseOrdersTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { data, error, isLoading, mutate } = useSWR<FlatResponse<PurchaseOrder>>('/api/inventory/purchase-orders', fetcher);
  const items = data?.data || [];

  const canWrite = role === 'owner' || role === 'admin';

  const handleReceive = async (poId: number) => {
    if (!confirm('Apakah Anda yakin ingin menerima PO ini? Stok akan otomatis ditambahkan.')) return;
    setErrorMsg('');
    try {
      await apiMutate(`/api/inventory/purchase-orders/${poId}/receive`, 'PATCH');
      mutate();
    } catch (err: unknown) {
      if (err instanceof FetchError) {
        if (err.status === 401 || err.status === 403) {
          setErrorMsg('Akses ditolak.');
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg('Terjadi kesalahan yang tidak diketahui.');
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
            + Buat PO
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {error ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-danger)' }}>
            Gagal memuat data: {error instanceof Error ? error.message : 'Error tidak diketahui'}
          </div>
        ) : isLoading ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Memuat data...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>No. PO</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Supplier</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Dibuat Oleh</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>Total</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>Status</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Tanggal</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>Aksi</th>
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
                      <span style={{ padding: 'var(--space-1) var(--space-2)', background: 'var(--color-warning)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>Pending</span>
                    ) : (
                      <span style={{ padding: 'var(--space-1) var(--space-2)', background: 'var(--color-success)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>Received</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{new Date(row.created_at).toLocaleDateString('id-ID')}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                    {canWrite && row.status === 'pending' && (
                      <button className="btn btn--ghost" onClick={() => handleReceive(row.id)} style={{ minHeight: '32px', padding: '0 var(--space-2)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }}>
                        Terima
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Belum ada data PO
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
