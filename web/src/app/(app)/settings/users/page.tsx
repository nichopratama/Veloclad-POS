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
      <h1
        style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 800,
          marginBottom: 'var(--space-6)',
          textAlign: 'center',
        }}
      >
        Manajemen Pengguna
      </h1>
      <UsersManager currentUserId={session.user.id} />
    </div>
  );
}
