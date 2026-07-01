'use client';

import { CsvUploader, DetailList, type UploaderStat } from './CsvUploader';

interface ItemsResult {
  message: string;
  stats: {
    items_imported: number;
    receipts_imported: number;
    skipped_existing: number;
    skipped_no_parent: number;
    skipped_unmatched: number;
  };
  unmatched?: string[];
  errors?: string[];
}

function buildStats(data: ItemsResult): UploaderStat[] {
  const s = data.stats;
  return [
    { label: 'Item diimpor', value: s.items_imported, color: 'var(--color-success, #16a34a)' },
    { label: 'Transaksi terisi', value: s.receipts_imported },
    { label: 'Sudah ada', value: s.skipped_existing },
    {
      label: 'Tanpa induk',
      value: s.skipped_no_parent,
      color: s.skipped_no_parent > 0 ? 'var(--color-warning, #d97706)' : 'var(--color-text-muted)',
    },
    {
      label: 'Tak cocok katalog',
      value: s.skipped_unmatched,
      color: s.skipped_unmatched > 0 ? 'var(--color-danger, #dc2626)' : 'var(--color-text-muted)',
    },
  ];
}

export function ImportTransactionItemsForm() {
  return (
    <CsvUploader<ItemsResult>
      endpoint="/api/imports/transaction-items"
      buildStats={buildStats}
      getSuccess={(d) => (d.stats.items_imported > 0 ? `Import item selesai: ${d.stats.items_imported} item diimpor` : null)}
      renderExtra={(d) => (
        <>
          <DetailList title="Item tak cocok katalog" items={d.unmatched ?? []} />
          <DetailList title="Detail dilewati" items={d.errors ?? []} />
        </>
      )}
      formatHint={
        <>
          <strong style={{ color: 'var(--color-text)' }}>Format detail item (transaction_detail):</strong>
          <br />
          Outlet, Receipt Number, Date, Time, Category, Brand, Items, Variant, SKU, Quantity, …, Gross
          Sales, Discounts, … Item dicocokkan ke katalog via <strong>nama (+ varian)</strong>; item tak
          cocok dilewati &amp; dilaporkan. <strong>Stok tidak berkurang.</strong> Jalankan setelah import
          transaksi (induk dicari via Receipt Number).
        </>
      }
    />
  );
}
