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
  Banknote,
  type LucideIcon,
} from 'lucide-react';
import { isAdmin } from '@/lib/roles';
import { useLocale } from '@/lib/i18n/LocaleContext';
import type { TranslationKeys } from '@/lib/i18n/translations';
import styles from './Sidebar.module.css';

type SubItem = { label: string; href: string };
type NavGroup = {
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  href?: string;
  sub?: SubItem[];
};

function buildNav(t: TranslationKeys): NavGroup[] {
  const n = t.nav;
  return [
    { label: n.dashboard, icon: LayoutDashboard, href: '/' },
    { label: n.cashierPos, icon: ShoppingCart, href: '/pos' },
    {
      label: n.purchaseOrder,
      icon: Truck,
      adminOnly: true,
      sub: [
        { label: n.purchaseOrdersList, href: '/inventory?tab=po' },
        { label: 'Accounts Payable', href: '/inventory?tab=payables' },
        { label: n.suppliersList, href: '/library?tab=suppliers' },
      ],
    },
    {
      label: n.inventory,
      icon: Package,
      adminOnly: true,
      sub: [
        { label: n.productManagement, href: '/library?tab=items' },
        { label: n.stockDetails, href: '/inventory?tab=stock' },
        { label: n.stockAdjustments, href: '/inventory?tab=adjustments' },
        { label: n.categories, href: '/library?tab=categories' },
        { label: n.bundlePackages, href: '/inventory?tab=bundles' },
      ],
    },
    {
      label: n.reports,
      icon: BarChart,
      adminOnly: true,
      sub: [
        { label: n.salesDynamic, href: '/reports?tab=summary' },
        { label: n.transactions, href: '/sales' },
      ],
    },
    {
      label: 'Finance',
      icon: Banknote,
      adminOnly: true,
      sub: [
        { label: 'Expenses', href: '/finance?tab=expenses' },
        { label: 'Expense Categories', href: '/finance?tab=categories' },
        { label: 'Income Statement', href: '/finance?tab=income' },
        { label: 'Cash Flow', href: '/finance?tab=cashflow' },
      ],
    },
    {
      label: n.customers,
      icon: Users,
      adminOnly: true,
      sub: [
        { label: n.customersList, href: '/library?tab=customers' },
        { label: n.loyaltyPrograms, href: '/customers?tab=loyalty' },
      ],
    },
    {
      label: n.settings,
      icon: Settings,
      adminOnly: true,
      sub: [
        { label: n.generalSettings, href: '/settings' },
        { label: n.paymentTypes, href: '/library?tab=payment-types' },
        { label: 'Expense Categories', href: '/library?tab=expense-categories' },
        { label: n.discounts, href: '/library?tab=discounts' },
        { label: n.receipts, href: '/settings?tab=receipts' },
        { label: n.userManagement, href: '/settings/users' },
      ],
    },
  ];
}

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
  storePhone,
}: {
  role: string;
  tenantName: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  storePhone?: string | null;
}) {
  // Inisial untuk state sidebar collapsed (mis. "vapescrew" → "VA").
  const tenantInitials = tenantName.slice(0, 2).toUpperCase();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const { t } = useLocale();

  const items = buildNav(t).filter((i) => !i.adminOnly || isAdmin(role));

  const isSubActive = (href: string): boolean => {
    const { path, tab } = parseHref(href);
    if (pathname !== path) return false;
    if (!tab) return true;
    const current = searchParams.get('tab') ?? DEFAULT_TAB[path] ?? null;
    return current === tab;
  };

  const isGroupActive = (group: NavGroup): boolean => {
    if (group.href) return pathname === group.href;
    return (group.sub ?? []).some((s) => isSubActive(s.href));
  };

  const toggle = (label: string, active: boolean) => {
    setOverrides((prev) => {
      const isOpen = prev[label] ?? active;
      if (isOpen) {
        // Jika sedang terbuka, maka kita tutup
        return { [label]: false };
      } else {
        // Jika sedang tertutup dan mau dibuka,
        // kita paksa tutup (false) semua grup lain agar bertindak sebagai accordion
        const next: Record<string, boolean> = {};
        items.forEach((g) => {
          next[g.label] = g.label === label;
        });
        return next;
      }
    });
  };

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
        <div className={styles.brand}>VeloPOS</div>
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

                <div
                  className={styles.submenuWrapper}
                  style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
                >
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
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.footer}>
        <div className={styles.phone}>
          <Phone size={14} fill="currentColor" />
          <span>{storePhone || '1500970'}</span>
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
