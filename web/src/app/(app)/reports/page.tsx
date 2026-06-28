import { requireAdminPage } from '@/lib/rbac';
import { ReportsView } from '@/components/reports/ReportsView';
import { Suspense } from 'react';

export default async function ReportsPage() {
  // Guard server: non-admin (kasir) yang membuka /reports via URL → ditendang ke beranda.
  await requireAdminPage();

  return (
    <div style={{ padding: 'var(--space-6)', height: '100%' }}>
      <Suspense fallback={<div>Loading reports...</div>}>
        <ReportsView />
      </Suspense>
    </div>
  );
}
