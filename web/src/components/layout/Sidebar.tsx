'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Settings,
  ChevronRight,
  ChevronDown,
  Phone,
  Info,
  Truck,
  BarChart,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { isAdmin } from '@/lib/roles';
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
  { label: 'Cashier POS', icon: ShoppingCart, href: '/pos' },
  {
    label: 'Purchase Order',
    icon: Truck,
    adminOnly: true,
    sub: [
      { label: 'Purchase Orders List', href: '/inventory?tab=po' },
      { label: 'Suppliers List', href: '/library?tab=suppliers' },
    ],
  },
  {
    label: 'Inventory',
    icon: Package,
    adminOnly: true,
    sub: [
      { label: 'Stock Details', href: '/inventory?tab=stock' },
      { label: 'Stock Adjustments', href: '/inventory?tab=adjustments' },
      { label: 'Categories', href: '/library?tab=categories' },
      { label: 'Bundle Packages', href: '/inventory?tab=bundles' },
    ],
  },
  {
    label: 'Reports',
    icon: BarChart,
    adminOnly: true,
    sub: [
      { label: 'Sales Dynamic Data', href: '/reports?tab=dynamic' },
      { label: 'Transactions', href: '/sales' },
    ],
  },
  {
    label: 'Customers',
    icon: Users,
    adminOnly: true,
    sub: [
      { label: 'Customers List', href: '/library?tab=customers' },
      { label: 'Customer Loyalty Programs', href: '/customers?tab=loyalty' },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    adminOnly: true,
    sub: [
      { label: 'Account Info', href: '/settings' },
      { label: 'Users Management', href: '/settings/users' },
      { label: 'Taxes', href: '/library?tab=taxes' },
      { label: 'Discounts', href: '/library?tab=discounts' },
      { label: 'Payment Methods', href: '/library?tab=payment-types' },
      { label: 'Receipts', href: '/settings?tab=receipts' },
    ],
  },
];

const DEFAULT_TAB: Record<string, string> = { 
  '/inventory': 'stock', 
  '/library': 'suppliers', // just a fallback
  '/reports': 'dynamic',
  '/customers': 'loyalty'
};

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

  const items = NAV.filter((i) => !i.adminOnly || isAdmin(role));

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
