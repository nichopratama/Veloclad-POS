import { requireAdminPage } from '@/lib/rbac';
import { UsersManager } from '@/components/users/UsersManager';

/**
 * Halaman Manajemen Pengguna (Pengaturan > Pengguna). Admin-only.
 * Mengelola akses login POS + role (Admin / Cashier).
 */
export default async function UsersSettingsPage() {
  const session = await requireAdminPage();

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
        <h1
          style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 800,
            marginBottom: 'var(--space-1)',
          }}
        >
          Manajemen Pengguna
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 'var(--text-sm)' }}>
          Manage user access, roles, and credentials.
        </p>
      </div>
      <UsersManager currentUserId={session.user.id} />
    </div>
  );
}
