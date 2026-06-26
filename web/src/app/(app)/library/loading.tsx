import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton';

/** Skeleton Library: bar aksi (search + tambah) + tabel (navigasi tab via sidebar). */
export default function LibraryLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
        <Skeleton width={280} height={36} />
        <Skeleton width={120} height={36} />
      </div>
      <SkeletonTable rows={10} cols={5} />
    </div>
  );
}
