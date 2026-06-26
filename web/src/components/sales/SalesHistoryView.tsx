'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { FilterBar } from './FilterBar';
import { TransactionTable } from './TransactionTable';
import { TransactionDetailModal } from './TransactionDetailModal';
import { VoidModal } from './VoidModal';
import { Transaction, TransactionsResponse } from './types';
import { formatIDR } from '@/components/pos/format';
import { SkeletonTable } from '@/components/ui/Skeleton';

export function SalesHistoryView({ role }: { role: string }) {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    search: '',
    status: '',
    paymentMethod: '',
  });
  const [page, setPage] = useState(1);
  const limit = 20;

  const [selectedDetail, setSelectedDetail] = useState<Transaction | null>(null);
  const [selectedVoid, setSelectedVoid] = useState<Transaction | null>(null);

  const queryParams = new URLSearchParams();
  if (filters.startDate) queryParams.set('startDate', filters.startDate);
  if (filters.endDate) queryParams.set('endDate', filters.endDate);
  if (filters.search) queryParams.set('search', filters.search);
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.paymentMethod) queryParams.set('paymentMethod', filters.paymentMethod);
  queryParams.set('page', page.toString());
  queryParams.set('limit', limit.toString());

  const cacheKey = `/api/sales/transactions?${queryParams.toString()}`;
  const { data, error, isLoading, mutate } = useSWR<TransactionsResponse>(cacheKey, fetcher);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset page on filter change
  };

  const handleVoidSuccess = () => {
    setSelectedVoid(null);
    mutate(); // revalidate SWR
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>Riwayat Transaksi</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card">
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Total Transaksi</div>
          <div className="money" style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
            {data?.summary.total_transactions ?? 0}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Total Diterima</div>
          <div className="money" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-success)' }}>
            {formatIDR(data?.summary.total_collected ?? 0)}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Penjualan Bersih</div>
          <div className="money" style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
            {formatIDR(data?.summary.net_sales ?? 0)}
          </div>
        </div>
      </div>

      <FilterBar filters={filters} onChange={handleFilterChange} />

      {error ? (
        <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-sm)' }}>
          Gagal memuat data: {error.message || 'Error tidak diketahui'}
        </div>
      ) : isLoading ? (
        <SkeletonTable rows={10} cols={6} />
      ) : (
        <TransactionTable
          transactions={data?.data ?? []}
          role={role}
          page={page}
          totalPages={data?.pagination.totalPages ?? 1}
          total={data?.pagination.total ?? 0}
          onPageChange={setPage}
          onDetailClick={setSelectedDetail}
          onVoidClick={setSelectedVoid}
        />
      )}

      {selectedDetail && (
        <TransactionDetailModal
          transaction={selectedDetail}
          onClose={() => setSelectedDetail(null)}
        />
      )}

      {selectedVoid && (
        <VoidModal
          transaction={selectedVoid}
          onClose={() => setSelectedVoid(null)}
          onSuccess={handleVoidSuccess}
        />
      )}
    </div>
  );
}
