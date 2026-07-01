'use client';

import { CsvUploader, DetailList, type UploaderStat } from './CsvUploader';

interface TransactionsResult {
  message: string;
  stats: { imported: number; skipped_duplicate: number; skipped_error: number };
  errors?: string[];
}

function buildStats(data: TransactionsResult): UploaderStat[] {
  return [
    { label: 'Berhasil diimpor', value: data.stats.imported, color: 'var(--color-success, #16a34a)' },
    { label: 'Duplikat dilewati', value: data.stats.skipped_duplicate },
    {
      label: 'Error',
      value: data.stats.skipped_error,
      color: data.stats.skipped_error > 0 ? 'var(--color-danger, #dc2626)' : 'var(--color-text-muted)',
    },
  ];
}

export function ImportTransactionsForm() {
  return (
    <CsvUploader<TransactionsResult>
      endpoint="/api/imports/transactions"
      buildStats={buildStats}
      getSuccess={(d) => (d.stats.imported > 0 ? `Import selesai: ${d.stats.imported} transaksi berhasil diimpor` : null)}
      renderExtra={(d) => <DetailList title="Detail error" items={d.errors ?? []} />}
      formatHint={
        <>
          <strong style={{ color: 'var(--color-text)' }}>Format CSV yang didukung:</strong>
          <br />
          Outlet, Date (DD/MM/YYYY atau DD-MM-YYYY), Time, Gross Sales, Discounts, Refunds, Net Sales,
          Gratuity, Tax, Total Collected, Total Amount, Other Note, Receipt Number, Collected By,
          Served By, Customer, Customer Phone, Items, Payment Method, Event Type, Reason of Refund.
          Delimiter <code>;</code> atau <code>,</code> terdeteksi otomatis.
        </>
      }
    />
  );
}
