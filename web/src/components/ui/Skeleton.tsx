import type { CSSProperties } from 'react';

/**
 * Skeleton primitif — blok abu berdenyut (pulse) untuk placeholder loading.
 * Server Component murni (tanpa state/efek) → nol JS klien, aman dipakai di loading.tsx.
 */
type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  radius?: string;
  style?: CSSProperties;
};

export function Skeleton({
  width = '100%',
  height = 14,
  radius = 'var(--radius-sm)',
  style,
}: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

/** Header halaman: judul + subjudul. */
export function SkeletonPageHeader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <Skeleton width={220} height={28} />
      <Skeleton width={320} height={14} />
    </div>
  );
}

/**
 * Baris tabel placeholder TANPA wrapper card — header + sejumlah baris × kolom.
 * Pakai ini bila sudah berada di dalam elemen .card (mis. tab inventory/library).
 */
export function SkeletonRows({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  const colKeys = Array.from({ length: cols }, (_, i) => `c${i}`);
  const rowKeys = Array.from({ length: rows }, (_, i) => `r${i}`);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
        {colKeys.map((k) => (
          <Skeleton key={k} height={14} />
        ))}
      </div>
      {rowKeys.map((rk) => (
        <div key={rk} style={{ display: 'flex', gap: 'var(--space-4)' }}>
          {colKeys.map((ck) => (
            <Skeleton key={ck} height={12} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Tabel placeholder lengkap dengan wrapper .card. */
export function SkeletonTable({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <SkeletonRows rows={rows} cols={cols} />
    </div>
  );
}
