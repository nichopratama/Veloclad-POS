import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { env } from '@/lib/env';
import { AppShell } from '@/components/layout/AppShell';

/**
 * Shell terproteksi (Server Component). Validasi session sebenarnya di sini
 * (middleware hanya cek optimistik). Tanpa session → /login.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const role = session.user.role ?? 'kasir';

  return (
    <AppShell userName={session.user.name} role={role} tenantName={env.TENANT_NAME}>
      {children}
    </AppShell>
  );
}

