import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton';

/** Skeleton Inventory: bar pencarian + tabel (navigasi tab via sidebar). */
export default function InventoryLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <Skeleton width={280} height={36} />
      <SkeletonTable rows={10} cols={5} />
    </div>
  );
}
