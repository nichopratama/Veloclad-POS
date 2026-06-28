import { requireAdminPage } from '@/lib/rbac';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { UnderConstruction } from '@/components/ui/UnderConstruction';
import { SettingsPageTitle } from '@/components/settings/SettingsPageTitle';

export default async function SettingsPage(props: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireAdminPage();
  const role = session.user.role ?? 'kasir';

  const sp = await props.searchParams;

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <SettingsPageTitle tab={sp.tab} />
      {sp.tab === 'receipts' ? (
        <UnderConstruction />
      ) : (
        <SettingsForm role={role} />
      )}
    </div>
  );
}
