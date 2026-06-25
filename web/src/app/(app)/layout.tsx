import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

/**
 * Shell terproteksi (Server Component). Validasi session sebenarnya di sini
 * (middleware hanya cek optimistik). Tanpa session → /login.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const role = session.user.role ?? 'kasir';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar role={role} />
      <div style={{ flex: 1, minWidth: 0, marginLeft: 'var(--sidebar-w)', display: 'flex', flexDirection: 'column' }}>
        <Header userName={session.user.name} role={role} />
        <main style={{ flex: 1, padding: 'var(--space-6)' }}>{children}</main>
      </div>
    </div>
  );
}

