import { requireAdminPage } from '@/lib/rbac';
import { entityConfigs } from '@/components/library/entityConfigs';
import { EntityManager } from '@/components/library/EntityManager';

export default async function LibraryPage(props: { searchParams: Promise<{ tab?: string }> }) {
  // Guard server: kasir yang membuka /library via URL langsung → ditendang ke beranda.
  const session = await requireAdminPage();
  const role = session.user.role ?? 'kasir';

  // Menu /library sudah adminOnly di Sidebar; mutasi tetap di-role-gate per config (defensif).
  const sp = await props.searchParams;
  const activeTab = sp.tab && entityConfigs[sp.tab] ? sp.tab : 'items';
  const activeConfig = entityConfigs[activeTab];

  // Judul selaras label submenu sidebar (fallback ke label config bila tak terpetakan).
  const tabTitles: Record<string, string> = {
    items: 'Products',
    categories: 'Categories',
    customers: 'Customers',
    suppliers: 'Suppliers',
    'payment-types': 'Payment Method',
    discounts: 'Discount',
  };
  const title = tabTitles[activeTab] ?? activeConfig.label;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 'var(--space-6)' }}>
        {title}
      </h1>

      <EntityManager config={activeConfig} role={role} />
    </div>
  );
}
