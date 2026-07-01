import { requireAdminPage } from '@/lib/rbac';
import { ImportTransactionsForm } from '@/components/imports/ImportTransactionsForm';
import { ImportTransactionItemsForm } from '@/components/imports/ImportTransactionItemsForm';

export default async function ImportPage() {
  await requireAdminPage();

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-1)' }}>
          Import Data Transaksi
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 'var(--text-sm)' }}>
          Upload file CSV transaksi historis dari sistem POS lain. Stok tidak akan berubah.
        </p>
      </div>

      <section style={{ marginBottom: 'var(--space-10)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
          1. Transaksi (header)
        </h2>
        <p style={{ color: 'var(--color-text-muted)', margin: '0 0 var(--space-4)', fontSize: 'var(--text-sm)' }}>
          File <code>transaction.csv</code> — total, pajak, metode bayar per struk.
        </p>
        <ImportTransactionsForm />
      </section>

      <section>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
          2. Detail Item (opsional)
        </h2>
        <p style={{ color: 'var(--color-text-muted)', margin: '0 0 var(--space-4)', fontSize: 'var(--text-sm)' }}>
          File <code>transaction_detail.csv</code> — melengkapi laporan per-item &amp; profit tanpa
          menyentuh stok. Jalankan setelah langkah 1.
        </p>
        <ImportTransactionItemsForm />
      </section>
    </div>
  );
}
