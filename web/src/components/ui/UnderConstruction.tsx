import { Wrench } from 'lucide-react';

export function UnderConstruction() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-[var(--color-text)] opacity-70 text-center gap-4">
      <Wrench size={48} strokeWidth={1.5} />
      <div>
        <h2 className="text-lg font-semibold mb-2">
          Fitur dalam Pengembangan
        </h2>
        <p className="text-sm">
          Halaman ini masih dalam tahap pengerjaan dan akan segera tersedia.
        </p>
      </div>
    </div>
  );
}
