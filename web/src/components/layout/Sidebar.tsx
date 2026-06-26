'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BookOpen,
  Settings,
  ChevronRight,
  ChevronDown,
  Phone,
  Info,
  type LucideIcon,
} from 'lucide-react';
import styles from './Sidebar.module.css';

type SubItem = { label: string; href: string };
type NavGroup = {
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  href?: string; // single link (tanpa submenu)
  sub?: SubItem[]; // submenu collapsible
};

// Struktur menu diselaraskan dengan aplikasi lama, tapi rute dipetakan ke skema
// app baru (tab via ?tab=). Role-gating dipertahankan: kasir tak lihat menu admin
// (ini hanya UX — RBAC server tetap penjaga sebenarnya).
const NAV: NavGroup[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  {
    label: 'Penjualan',
    icon: ShoppingCart,
    sub: [
      { label: 'POS Kasir', href: '/pos' },
      { label: 'Riwayat Transaksi', href: '/sales' },
    ],
  },
  {
    label: 'Inventory',
    icon: Package,
    adminOnly: true,
    sub: [
      { label: 'Stock Summary', href: '/inventory?tab=stock' },
      { label: 'Stock Adjustment', href: '/inventory?tab=adjustments' },
      { label: 'Purchase Order', href: '/inventory?tab=po' },
    ],
  },
  {
    label: 'Library',
    icon: BookOpen,
    adminOnly: true,
    sub: [
      { label: 'Products', href: '/library?tab=items' },
      { label: 'Categories', href: '/library?tab=categories' },
      { label: 'Customers', href: '/library?tab=customers' },
      { label: 'Suppliers', href: '/library?tab=suppliers' },
      { label: 'Payment Method', href: '/library?tab=payment-types' },
      { label: 'Discount', href: '/library?tab=discounts' },
    ],
  },
  { label: 'Pengaturan', icon: Settings, adminOnly: true, href: '/settings' },
];

const DEFAULT_TAB: Record<string, string> = { '/inventory': 'stock', '/library': 'items' };

function parseHref(href: string): { path: string; tab: string | null } {
  const [path, query = ''] = href.split('?');
  return { path, tab: new URLSearchParams(query).get('tab') };
}

export function Sidebar({
  role,
  tenantName,
  isOpen,
  setIsOpen,
}: {
  role: string;
  tenantName: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  // Inisial untuk state sidebar collapsed (mis. "vapescrew" → "VA").
  const tenantInitials = tenantName.slice(0, 2).toUpperCase();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const isAdmin = role === 'owner' || role === 'admin';
  const items = NAV.filter((i) => !i.adminOnly || isAdmin);

  const isSubActive = (href: string): boolean => {
    const { path, tab } = parseHref(href);
    if (pathname !== path) return false;
    if (!tab) return true;
    const current = searchParams.get('tab') ?? DEFAULT_TAB[path] ?? null;
    return current === tab;
  };

  const isGroupActive = (group: NavGroup): boolean => {
    if (group.href) return pathname === group.href;
    return (group.sub ?? []).some((s) => pathname === parseHref(s.href).path);
  };

  const toggle = (label: string, active: boolean) =>
    setOverrides((prev) => ({ ...prev, [label]: !(prev[label] ?? active) }));

  return (
    <>
      {isOpen && (
        <div 
          className={styles.overlay} 
          onClick={() => setIsOpen(false)} 
          aria-hidden="true" 
        />
      )}
      <aside className={`${styles.sidebar} ${!isOpen ? styles.sidebarHidden : ''} ${!isOpen ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.header}>
        <div className={styles.brand}>AntiGravity POS</div>
        <div
          className={styles.tenant}
          style={{ ['--tenant-initials' as string]: `"${tenantInitials}"` }}
        >
          <span>{tenantName}</span>
          <ChevronDown size={18} />
        </div>
      </div>

      <nav className={styles.nav}>
        <ul className={styles.list}>
          {items.map((group) => {
            const active = isGroupActive(group);
            const Icon = group.icon;

            // Single link (tanpa submenu).
            if (group.href) {
              return (
                <li key={group.label}>
                  <Link href={group.href} className={`${styles.link} ${active ? styles.linkActive : ''}`}>
                    <span className={styles.placeholder} />
                    <Icon size={18} style={{ opacity: 0.9 }} />
                    <span className={styles.label}>{group.label}</span>
                  </Link>
                </li>
              );
            }

            // Group dengan submenu collapsible.
            const open = overrides[group.label] ?? active;
            return (
              <li key={group.label}>
                <button
                  type="button"
                  className={`${styles.link} ${active ? styles.linkActive : ''}`}
                  aria-expanded={open}
                  onClick={() => toggle(group.label, active)}
                >
                  <span className={styles.chevron}>
                    {open ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
                  </span>
                  <Icon size={18} style={{ opacity: 0.9 }} />
                  <span className={styles.label}>{group.label}</span>
                </button>

                {open && (
                  <ul className={styles.submenu}>
                    {(group.sub ?? []).map((s) => (
                      <li key={s.href}>
                        <Link
                          href={s.href}
                          className={`${styles.sublink} ${isSubActive(s.href) ? styles.sublinkActive : ''}`}
                        >
                          {s.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.footer}>
        <div className={styles.phone}>
          <Phone size={14} fill="currentColor" />
          <span>1500970</span>
        </div>
        <button type="button" className={styles.help}>
          <span className={styles.helpIcon}>
            <Info size={18} />
          </span>
          <span className={styles.helpText}>Tutorials &amp; Help</span>
        </button>
      </div>
    </aside>
    </>
  );
}
