import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { env } from '@/lib/env';
import { AppShell } from '@/components/layout/AppShell';
import { prisma } from '@/lib/prisma';

/**
 * Shell terproteksi (Server Component). Validasi session sebenarnya di sini
 * (middleware hanya cek optimistik). Tanpa session → /login.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const role = session.user.role ?? 'kasir';
  
  const storeSettings = await prisma.store_settings.findFirst();
  const tenantName = storeSettings?.name || env.TENANT_NAME;

  return (
    <AppShell userId={session.user.id} email={session.user.email} userName={session.user.name} role={role} image={session.user.image} tenantName={tenantName} storePhone={storeSettings?.phone}>
      {children}
    </AppShell>
  );
}

