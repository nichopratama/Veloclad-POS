import { Skeleton, SkeletonPageHeader } from '@/components/ui/Skeleton';

/** Skeleton Pengaturan: 3 kartu seksi berisi label + field. */
export default function SettingsLoading() {
  const sectionKeys = ['sec1', 'sec2', 'sec3'];
  const fieldKeys = ['f1', 'f2', 'f3'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <SkeletonPageHeader />

      {sectionKeys.map((sk) => (
        <div key={sk} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 640 }}>
          <Skeleton width={160} height={16} style={{ marginBottom: 'var(--space-2)' }} />
          {fieldKeys.map((fk) => (
            <div key={fk} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <Skeleton width={120} height={12} />
              <Skeleton width="100%" height={36} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
