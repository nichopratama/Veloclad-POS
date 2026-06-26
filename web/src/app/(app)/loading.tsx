import { Skeleton, SkeletonPageHeader } from '@/components/ui/Skeleton';

/** Skeleton Dashboard: 3 kartu statistik + chart + panel produk terlaris. */
export default function DashboardLoading() {
  const statKeys = ['s1', 's2', 's3'];
  const topKeys = ['t1', 't2', 't3', 't4'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <SkeletonPageHeader />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-6)' }}>
        {statKeys.map((k) => (
          <div key={k} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Skeleton width={140} height={12} />
            <Skeleton width={120} height={32} />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
        <div className="card">
          <Skeleton width={180} height={16} style={{ marginBottom: 'var(--space-6)' }} />
          <Skeleton width="100%" height={240} radius="var(--radius)" />
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Skeleton width={120} height={16} style={{ marginBottom: 'var(--space-2)' }} />
          {topKeys.map((k) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Skeleton width={32} height={32} radius="50%" />
              <Skeleton width="60%" height={14} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
