import { Wrench } from 'lucide-react';

export function UnderConstruction() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      color: 'var(--color-text)',
      opacity: 0.7,
      textAlign: 'center',
      gap: 'var(--space-4)'
    }}>
      <Wrench size={48} strokeWidth={1.5} />
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
          Fitur dalam Pengembangan
        </h2>
        <p style={{ fontSize: 'var(--text-sm)' }}>
          Halaman ini masih dalam tahap pengerjaan dan akan segera tersedia.
        </p>
      </div>
    </div>
  );
}
