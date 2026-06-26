'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { StockItem, PaginatedResponse } from './types';
import { useDebounce } from '@/components/pos/useDebounce';
import { formatIDRFromString } from '@/components/pos/format';

export function StockSummaryTab() {
  const [page, setPage] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const search = useDebounce(localSearch, 300);
  const limit = 30;

  const qs = new URLSearchParams();
  qs.set('page', page.toString());
  qs.set('limit', limit.toString());
  if (search) qs.set('search', search);

  const { data, error, isLoading } = useSWR<PaginatedResponse<StockItem>>(`/api/inventory/stock-summary?${qs.toString()}`, fetcher);

  const items = data?.data || [];
  const pagination = data?.pagination;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    setPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: '100%' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <input
            type="text"
            className="input"
            placeholder="Cari Kode / Nama Item..."
            value={localSearch}
            onChange={handleSearchChange}
          />
        </div>
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
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Kode</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Nama Item</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Kategori</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>Stok</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>Min Stok</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>Harga</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const isLowStock = row.stock <= row.min_stock;
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)', background: isLowStock ? 'var(--color-warning)' : 'inherit' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)' }}>{row.code}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <div style={{ fontWeight: 600 }}>{row.name}</div>
                      {isLowStock && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', fontWeight: 700 }}>Menipis!</div>}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{row.categories?.name || '-'}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontWeight: isLowStock ? 700 : 400, color: isLowStock ? 'var(--color-danger)' : 'inherit' }}>
                      {row.stock} {row.unit}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{row.min_stock} {row.unit}</td>
                    <td className="money" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{formatIDRFromString(row.price)}</td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Belum ada data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        
        {pagination && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Total {pagination.total} baris
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <button 
                className="btn btn--ghost" 
                disabled={page <= 1} 
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span style={{ margin: '0 var(--space-2)' }}>{page} / {pagination.totalPages || 1}</span>
              <button 
                className="btn btn--ghost" 
                disabled={page >= pagination.totalPages} 
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
