import { requireAdminPage } from '@/lib/rbac';
import { SettingsForm } from '@/components/settings/SettingsForm';

export default async function SettingsPage() {
  // Guard server: non-admin (kasir) yang membuka /settings via URL → ditendang ke beranda.
  const session = await requireAdminPage();
  const role = session.user.role ?? 'kasir';

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-6)', textAlign: 'center' }}>Pengaturan Toko</h1>
      <SettingsForm role={role} />
    </div>
  );
}
