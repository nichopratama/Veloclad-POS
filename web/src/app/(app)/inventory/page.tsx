import { requireAdminPage } from '@/lib/rbac';
import { InventoryView } from '@/components/inventory/InventoryView';

export default async function InventoryPage() {
  // Guard server: non-admin (kasir) yang membuka /inventory via URL → ditendang ke beranda.
  const session = await requireAdminPage();
  const role = session.user.role ?? 'kasir';

  return <InventoryView role={role} />;
}
