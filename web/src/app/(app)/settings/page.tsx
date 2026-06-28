import { requireAdminPage } from '@/lib/rbac';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { UnderConstruction } from '@/components/ui/UnderConstruction';

export default async function SettingsPage(props: { searchParams: Promise<{ tab?: string }> }) {
  // Guard server: non-admin (kasir) yang membuka /settings via URL → ditendang ke beranda.
  const session = await requireAdminPage();
  const role = session.user.role ?? 'kasir';

  const sp = await props.searchParams;

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-6)', textAlign: 'center' }}>
        {sp.tab === 'receipts' ? 'Receipts' : 'Pengaturan Toko'}
      </h1>
      {sp.tab === 'receipts' ? (
        <UnderConstruction />
      ) : (
        <SettingsForm role={role} />
      )}
    </div>
  );
}
