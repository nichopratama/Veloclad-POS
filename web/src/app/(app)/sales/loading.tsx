import { Skeleton, SkeletonPageHeader, SkeletonTable } from '@/components/ui/Skeleton';

/** Skeleton Riwayat Transaksi: kartu ringkasan + filter + tabel. */
export default function SalesLoading() {
  const summaryKeys = ['a', 'b', 'c'];
  const filterKeys = ['f1', 'f2', 'f3', 'f4'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <SkeletonPageHeader />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-6)' }}>
        {summaryKeys.map((k) => (
          <div key={k} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Skeleton width={120} height={12} />
            <Skeleton width={140} height={24} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        {filterKeys.map((k) => (
          <Skeleton key={k} width={160} height={36} />
        ))}
      </div>

      <SkeletonTable rows={10} cols={6} />
    </div>
  );
}
