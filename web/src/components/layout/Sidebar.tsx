import Link from 'next/link';

type NavItem = { href: string; label: string; adminOnly?: boolean };

const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/pos', label: 'Kasir (POS)' },
  { href: '/sales', label: 'Riwayat Penjualan' },
  { href: '/inventory', label: 'Inventory', adminOnly: true },
  { href: '/library', label: 'Library', adminOnly: true },
  { href: '/settings', label: 'Pengaturan', adminOnly: true },
];

/**
 * Navigasi samping. Role-gating UI: menu admin disembunyikan dari kasir.
 * Catatan: ini hanya UX — API tetap penjaga sebenarnya (RBAC server).
 * Drawer mobile = polesan Sonet (M3).
 */
export function Sidebar({ role }: { role: string }) {
  const isAdmin = role === 'owner' || role === 'admin';
  const items = NAV.filter((i) => !i.adminOnly || isAdmin);

  return (
    <aside
      style={{
        position: 'fixed',
        insetBlock: 0,
        insetInlineStart: 0,
        width: 'var(--sidebar-w)',
        background: 'var(--color-surface)',
        borderInlineEnd: '1px solid var(--color-border)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)', padding: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
        AntiGravity POS
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              padding: '0 var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text)',
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

