'use client';

import { useLocale } from '@/lib/i18n/LocaleContext';

export function UsersPageHeader() {
  const { t } = useLocale();
  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-1)' }}>
        {t.users.pageTitle}
      </h1>
      <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 'var(--text-sm)' }}>
        {t.users.pageSubtitle}
      </p>
    </div>
  );
}
