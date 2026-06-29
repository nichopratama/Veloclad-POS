'use client';

import { useLocale } from '@/lib/i18n/LocaleContext';

export function SettingsPageTitle({ tab }: { tab?: string }) {
  const { t } = useLocale();
  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-1)' }}>
        {tab === 'receipts' ? t.settings.receipts : t.settings.storeSettings}
      </h1>
      <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 'var(--text-sm)' }}>
        {tab === 'receipts' ? t.settings.receiptsDesc : t.settings.storeSettingsDesc}
      </p>
    </div>
  );
}
