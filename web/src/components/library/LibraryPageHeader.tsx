'use client';

import { useLocale } from '@/lib/i18n/LocaleContext';

const TAB_KEY_MAP: Record<string, 'items' | 'categories' | 'customers' | 'suppliers' | 'paymentTypes' | 'discounts' | 'expenseCategories'> = {
  items: 'items',
  categories: 'categories',
  customers: 'customers',
  suppliers: 'suppliers',
  'payment-types': 'paymentTypes',
  discounts: 'discounts',
  'expense-categories': 'expenseCategories',
};

export function LibraryPageHeader({ tabKey }: { tabKey: string }) {
  const { t } = useLocale();
  const mapped = TAB_KEY_MAP[tabKey];

  const title = mapped ? (t.library.tabTitles as any)[mapped] : tabKey;
  const description = mapped ? (t.library.tabDescriptions as any)[mapped] : '';

  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
        {title}
      </h1>
      <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
        {description}
      </p>
    </div>
  );
}
