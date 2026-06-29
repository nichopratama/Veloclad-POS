import { requireAdminPage } from '@/lib/rbac';
import { UsersManager } from '@/components/users/UsersManager';
import { UsersPageHeader } from '@/components/users/UsersPageHeader';

export default async function UsersSettingsPage() {
  const session = await requireAdminPage();

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <UsersPageHeader />
      <UsersManager currentUserId={session.user.id} />
    </div>
  );
}
