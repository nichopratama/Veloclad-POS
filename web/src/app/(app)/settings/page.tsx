import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SettingsForm } from '@/components/settings/SettingsForm';

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const role = session.user.role ?? 'kasir';

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-6)', textAlign: 'center' }}>Pengaturan Toko</h1>
      <SettingsForm role={role} />
    </div>
  );
}
