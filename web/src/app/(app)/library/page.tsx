import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { entityConfigs } from '@/components/library/entityConfigs';
import { EntityManager } from '@/components/library/EntityManager';

export default async function LibraryPage(props: { searchParams: Promise<{ tab?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const role = session.user.role ?? 'kasir';

  // Menu /library sudah adminOnly di Sidebar; mutasi tetap di-role-gate per config (defensif).
  const sp = await props.searchParams;
  const activeTab = sp.tab && entityConfigs[sp.tab] ? sp.tab : 'items';
  const activeConfig = entityConfigs[activeTab];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-6)', overflowX: 'auto' }}>
        {Object.values(entityConfigs).map((cfg) => (
          <a
            key={cfg.key}
            href={`/library?tab=${cfg.key}`}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              fontWeight: activeTab === cfg.key ? 700 : 500,
              color: activeTab === cfg.key ? 'var(--color-accent)' : 'var(--color-text-muted)',
              borderBottom: activeTab === cfg.key ? '2px solid var(--color-accent)' : '2px solid transparent',
              whiteSpace: 'nowrap'
            }}
          >
            {cfg.label}
          </a>
        ))}
      </div>

      <EntityManager config={activeConfig} role={role} />
    </div>
  );
}
