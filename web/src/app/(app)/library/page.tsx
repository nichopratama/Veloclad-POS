import { requireAdminPage } from '@/lib/rbac';
import { entityConfigs } from '@/components/library/entityConfigs';
import { EntityManager } from '@/components/library/EntityManager';
import { UnderConstruction } from '@/components/ui/UnderConstruction';

export default async function LibraryPage(props: { searchParams: Promise<{ tab?: string }> }) {
  // Guard server: kasir yang membuka /library via URL langsung → ditendang ke beranda.
  const session = await requireAdminPage();
  const role = session.user.role ?? 'kasir';

  // Menu /library sudah adminOnly di Sidebar; mutasi tetap di-role-gate per config (defensif).
  const sp = await props.searchParams;

  if (sp.tab === 'taxes') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 'var(--space-6)' }}>
          Taxes
        </h1>
        <UnderConstruction />
      </div>
    );
  }

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

  const tabDescriptions: Record<string, string> = {
    items: 'Manage all your product inventory and pricing.',
    categories: 'Organize your products into categories.',
    customers: 'Manage your customer database and details.',
    suppliers: 'Manage your supplier database and contact info.',
    'payment-types': 'Configure accepted payment methods for transactions.',
    discounts: 'Manage discount rules and promotional offers.',
  };
  const description = tabDescriptions[activeTab] ?? `Manage your ${title.toLowerCase()}.`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
          {title}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          {description}
        </p>
      </div>

      <EntityManager config={activeConfig} role={role} />
    </div>
  );
}
