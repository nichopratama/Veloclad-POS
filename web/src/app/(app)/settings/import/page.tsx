import { requireAdminPage } from '@/lib/rbac';
import { ImportTransactionsForm } from '@/components/imports/ImportTransactionsForm';

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
      <ImportTransactionsForm />
    </div>
  );
}
