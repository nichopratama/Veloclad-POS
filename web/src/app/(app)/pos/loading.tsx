import { Skeleton, SkeletonPageHeader } from '@/components/ui/Skeleton';

/** Skeleton POS Kasir: panel produk (grid) di kiri + panel keranjang di kanan. */
export default function PosLoading() {
  const productKeys = Array.from({ length: 8 }, (_, i) => `p${i}`);
  const payKeys = ['m1', 'm2', 'm3', 'm4'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <SkeletonPageHeader />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Panel produk */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Skeleton width={90} height={16} />
          <Skeleton width="100%" height={40} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
            {productKeys.map((k) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
                <Skeleton width="80%" height={14} />
                <Skeleton width="50%" height={12} />
                <Skeleton width="60%" height={16} />
              </div>
            ))}
          </div>
        </div>

        {/* Panel keranjang */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Skeleton width={120} height={16} />
          <Skeleton width="100%" height={80} radius="var(--radius)" />
          <Skeleton width="100%" height={1} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Skeleton width={80} height={14} />
            <Skeleton width={60} height={14} />
          </div>
          <Skeleton width="100%" height={36} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
            {payKeys.map((k) => (
              <Skeleton key={k} height={40} />
            ))}
          </div>
          <Skeleton width="100%" height={44} radius="var(--radius-sm)" />
        </div>
      </div>
    </div>
  );
}
