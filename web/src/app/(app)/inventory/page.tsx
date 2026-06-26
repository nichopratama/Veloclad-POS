import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { InventoryView } from '@/components/inventory/InventoryView';

export default async function InventoryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const role = session.user.role ?? 'kasir';

  // Menu /inventory sudah adminOnly di Sidebar; mutasi tetap di-role-gate per tab (defensif).
  
  return <InventoryView role={role} />;
}
