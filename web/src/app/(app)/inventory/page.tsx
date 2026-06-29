import { getSession } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import { InventoryView } from '@/components/inventory/InventoryView';

export default async function InventoryPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  
  const role = session.user.role ?? 'kasir';

  return <InventoryView role={role} />;
}
