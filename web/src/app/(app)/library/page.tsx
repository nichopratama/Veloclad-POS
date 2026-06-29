import { getSession } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import { entityConfigs } from '@/components/library/entityConfigs';
import { EntityManager } from '@/components/library/EntityManager';
import { LibraryPageHeader } from '@/components/library/LibraryPageHeader';
import { UnderConstruction } from '@/components/ui/UnderConstruction';

export default async function LibraryPage(props: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  
  const role = session.user.role ?? 'kasir';

  // Menu /library sudah adminOnly di Sidebar; mutasi tetap di-role-gate per config (defensif).
  const sp = await props.searchParams;

  if (sp.tab === 'taxes') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 'var(--space-6)' }}>
          Taxes
        </h1>
        <UnderConstruction />
      </div>
    );
  }

  const activeTab = sp.tab && entityConfigs[sp.tab] ? sp.tab : 'items';
  const activeConfig = entityConfigs[activeTab];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <LibraryPageHeader tabKey={activeTab} />
      <EntityManager config={activeConfig} role={role} />
    </div>
  );
}
