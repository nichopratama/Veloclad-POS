import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SalesHistoryView } from '@/components/sales/SalesHistoryView';

export default async function SalesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const role = session.user.role ?? 'kasir';

  return <SalesHistoryView role={role} />;
}
