'use client';

import { useLocale } from '@/lib/i18n/LocaleContext';

export function SettingsPageTitle({ tab }: { tab?: string }) {
  const { t } = useLocale();
  return (
    <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-6)', textAlign: 'center' }}>
      {tab === 'receipts' ? t.settings.receipts : t.settings.storeSettings}
    </h1>
  );
}
