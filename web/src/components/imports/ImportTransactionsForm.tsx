'use client';

import { useState, useRef } from 'react';
import { toast } from '@/lib/toast';

interface ImportStats {
  imported: number;
  skipped_duplicate: number;
  skipped_error: number;
}

interface ImportResult {
  message: string;
  stats: ImportStats;
  errors?: string[];
}

export function ImportTransactionsForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(f: File | null) {
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      toast.error('Hanya file .csv yang didukung');
      return;
    }
    setFile(f);
    setResult(null);
  }

  async function handleSubmit() {
    if (!file) return;
    setIsLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/imports/transactions', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Import gagal');
        return;
      }

      setResult(data);
      if (data.stats.imported > 0) {
        toast.success(`Import selesai: ${data.stats.imported} transaksi berhasil diimpor`);
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Upload Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFileChange(e.dataTransfer.files[0] ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragOver ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-10)',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragOver ? 'var(--color-accent-subtle, rgba(3,57,108,0.05))' : 'var(--color-surface)',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        />
        <div style={{ fontSize: 40, marginBottom: 'var(--space-3)' }}>📂</div>
        {file ? (
          <>
            <p style={{ fontWeight: 600, margin: 0 }}>{file.name}</p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 4 }}>
              {(file.size / 1024).toFixed(1)} KB — klik untuk ganti file
            </p>
          </>
        ) : (
          <>
            <p style={{ fontWeight: 600, margin: 0 }}>Drag & drop file CSV di sini</p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 4 }}>
              atau klik untuk browse file
            </p>
          </>
        )}
      </div>

      {/* Format info */}
      <div style={{
        marginTop: 'var(--space-4)',
        padding: 'var(--space-4)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text-muted)',
      }}>
        <strong style={{ color: 'var(--color-text)' }}>Format CSV yang didukung:</strong>
        <br />
        Outlet, Date (DD-MM-YYYY), Time, Gross Sales, Discounts, Refunds, Net Sales, Gratuity, Tax,
        Total Collected, Total Amount, Other Note, Receipt Number, Collected By, Served By,
        Customer, Customer Phone, Items, Payment Method, Event Type, Reason of Refund
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
        <button
          onClick={handleSubmit}
          disabled={!file || isLoading}
          style={{
            padding: 'var(--space-2) var(--space-6)',
            background: !file || isLoading ? 'var(--color-border)' : 'var(--color-accent)',
            color: !file || isLoading ? 'var(--color-text-muted)' : '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: !file || isLoading ? 'not-allowed' : 'pointer',
            fontSize: 'var(--text-sm)',
          }}
        >
          {isLoading ? 'Sedang mengimpor...' : 'Import'}
        </button>
        {(file || result) && (
          <button
            onClick={handleReset}
            disabled={isLoading}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: 'var(--text-sm)',
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Result */}
      {result && (
        <div style={{
          marginTop: 'var(--space-6)',
          padding: 'var(--space-5)',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
        }}>
          <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-base)', fontWeight: 700 }}>
            Hasil Import
          </h3>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
            <StatCard label="Berhasil diimpor" value={result.stats.imported} color="var(--color-success, #16a34a)" />
            <StatCard label="Duplikat dilewati" value={result.stats.skipped_duplicate} color="var(--color-text-muted)" />
            <StatCard label="Error" value={result.stats.skipped_error} color={result.stats.skipped_error > 0 ? 'var(--color-danger, #dc2626)' : 'var(--color-text-muted)'} />
          </div>

          {/* Errors */}
          {result.errors && result.errors.length > 0 && (
            <div>
              <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                Detail error ({result.errors.length}):
              </p>
              <ul style={{
                margin: 0,
                padding: '0 0 0 var(--space-4)',
                maxHeight: 240,
                overflowY: 'auto',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
              }}>
                {result.errors.map((err, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      padding: 'var(--space-3) var(--space-4)',
      background: 'var(--color-bg)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      minWidth: 120,
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
