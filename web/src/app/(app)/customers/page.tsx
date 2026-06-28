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

  const descriptions: Record<string, string> = {
    loyalty: 'Manage points and rewards for your loyal customers.',
  };
  const description = sp.tab && descriptions[sp.tab] ? descriptions[sp.tab] : 'Manage your customer database and details.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-6)' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
          {title}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          {description}
        </p>
      </div>
      <UnderConstruction />
    </div>
  );
}
