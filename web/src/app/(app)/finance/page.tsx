import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/rbac';
import { FinanceView } from '@/components/finance/FinanceView';

export default async function FinancePage() {
  const session = await requireAuth();

  if (session.user.role !== 'admin') {
    redirect('/');
  }

  return <FinanceView role={session.user.role} />;
}
