'use client';

import { formatIDRFromString } from './format';
import type { TransactionReceipt } from './types';
import { useLocale } from '@/lib/i18n/LocaleContext';

type Props = {
  transactionId: string;
  receipt: TransactionReceipt;
  onNew: () => void;
};

export function ReceiptModal({ transactionId, receipt, onNew }: Props) {
  const { t } = useLocale();

  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: t.pos.subtotal, value: formatIDRFromString(receipt.subtotal) },
    { label: t.pos.discount, value: formatIDRFromString(receipt.discount_amount) },
    { label: t.pos.tax, value: formatIDRFromString(receipt.tax_amount) },
    { label: t.common.total, value: formatIDRFromString(receipt.total), strong: true },
    { label: t.pos.paymentAmount, value: formatIDRFromString(receipt.payment_amount) },
    { label: t.pos.change, value: formatIDRFromString(receipt.change_amount), strong: true },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.pos.receipt}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'oklch(20% 0.02 262 / 0.45)',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-4)',
        zIndex: 50,
      }}
    >
      <div
        className="card"
        style={{
          width: 'min(100%, 380px)',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div
          id="receipt-print"
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>{t.pos.transactionSuccess}</h2>
            <p className="money" style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              {transactionId}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              borderTop: '1px dashed var(--color-border)',
              paddingTop: 'var(--space-3)',
            }}
          >
            {rows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 'var(--space-4)',
                }}
              >
                <span
                  style={{
                    fontSize: row.strong ? 'var(--text-base)' : 'var(--text-sm)',
                    fontWeight: row.strong ? 700 : 400,
                    color: row.strong ? 'var(--color-text)' : 'var(--color-text-muted)',
                  }}
                >
                  {row.label}
                </span>
                <span
                  className="money"
                  style={{
                    fontSize: row.strong ? 'var(--text-base)' : 'var(--text-sm)',
                    fontWeight: row.strong ? 700 : 500,
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="receipt-actions"
          style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}
        >
          <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={() => window.print()}>
            {t.pos.print}
          </button>
          <button type="button" className="btn" style={{ flex: 1 }} onClick={onNew}>
            {t.pos.newTransaction}
          </button>
        </div>
      </div>
    </div>
  );
}
