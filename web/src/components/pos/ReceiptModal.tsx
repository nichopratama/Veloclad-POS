'use client';

import { formatIDRFromString } from './format';
import type { TransactionReceipt } from './types';

type Props = {
  transactionId: string;
  receipt: TransactionReceipt;
  onNew: () => void;
};

/**
 * Modal struk. Angka diambil dari response.receipt (otoritatif server),
 * BUKAN hitungan klien. Cetak via window.print() pada area #receipt-print.
 */
export function ReceiptModal({ transactionId, receipt, onNew }: Props) {
  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: 'Subtotal', value: formatIDRFromString(receipt.subtotal) },
    { label: 'Diskon', value: formatIDRFromString(receipt.discount_amount) },
    { label: 'Pajak', value: formatIDRFromString(receipt.tax_amount) },
    { label: 'Total', value: formatIDRFromString(receipt.total), strong: true },
    { label: 'Bayar', value: formatIDRFromString(receipt.payment_amount) },
    { label: 'Kembalian', value: formatIDRFromString(receipt.change_amount), strong: true },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Struk transaksi"
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
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>Transaksi Berhasil</h2>
            <p
              className="money"
              style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}
            >
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
          <button
            type="button"
            className="btn btn--ghost"
            style={{ flex: 1 }}
            onClick={() => window.print()}
          >
            Cetak
          </button>
          <button type="button" className="btn" style={{ flex: 1 }} onClick={onNew}>
            Transaksi Baru
          </button>
        </div>
      </div>
    </div>
  );
}
