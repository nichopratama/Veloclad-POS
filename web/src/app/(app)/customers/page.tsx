import { requireAdminPage } from '@/lib/rbac';
import { UnderConstruction } from '@/components/ui/UnderConstruction';

export default async function CustomersPage(props: { searchParams: Promise<{ tab?: string }> }) {
  // Guard server: non-admin (kasir) yang membuka /customers via URL → ditendang ke beranda.
  await requireAdminPage();
  const sp = await props.searchParams;

  const titles: Record<string, string> = {
    loyalty: 'Customer Loyalty Programs',
  };
  const title = sp.tab && titles[sp.tab] ? titles[sp.tab] : 'Customers';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-6)' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 'var(--space-6)' }}>
        {title}
      </h1>
      <UnderConstruction />
    </div>
  );
}
