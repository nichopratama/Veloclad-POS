'use client';

import type { Dispatch } from 'react';
import useSWR from 'swr';
import { lineSubtotal, type CartAction } from './cartReducer';
import { formatIDR } from './format';
import type { CartLine, Customer, ListResponse, PaymentType } from './types';

type Props = {
  lines: CartLine[];
  dispatch: Dispatch<CartAction>;
  customerId: number | null;
  onCustomerChange: (id: number | null) => void;
  paymentTypeId: number | null;
  onPaymentTypeChange: (id: number | null) => void;
  paymentAmount: string;
  onPaymentAmountChange: (value: string) => void;
  subtotal: number;
  discountTotal: number;
  total: number;
  change: number;
  canPay: boolean;
  isSubmitting: boolean;
  errorMessage: string;
  onPay: () => void;
};

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
};

function QtyButton({
  label,
  onClick,
  ariaLabel,
}: {
  label: string;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: '44px',
        height: '44px',
        flexShrink: 0,
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
        fontSize: 'var(--text-lg)',
        fontWeight: 700,
        cursor: 'pointer',
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  );
}

export function CartPanel(props: Props) {
  const {
    lines,
    dispatch,
    customerId,
    onCustomerChange,
    paymentTypeId,
    onPaymentTypeChange,
    paymentAmount,
    onPaymentAmountChange,
    subtotal,
    discountTotal,
    total,
    change,
    canPay,
    isSubmitting,
    errorMessage,
    onPay,
  } = props;

  const { data: customersData } = useSWR<ListResponse<Customer>>('/api/library/customers');
  const { data: paymentData, error: paymentError } =
    useSWR<ListResponse<PaymentType>>('/api/library/payment-types');

  const customers = customersData?.data ?? [];
  const activePayments = (paymentData?.data ?? []).filter((p) => p.is_active);

  return (
    <section
      className="card"
      style={{
        flex: '1 1 360px',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
      aria-label="Keranjang dan pembayaran"
    >
      <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Keranjang</h2>

      {/* Cart lines */}
      {lines.length === 0 ? (
        <p
          style={{
            margin: 0,
            padding: 'var(--space-6) 0',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: 'var(--text-sm)',
          }}
        >
          Keranjang masih kosong. Pilih produk dari panel kiri.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {lines.map((line) => (
            <li
              key={line.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                paddingBottom: 'var(--space-3)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 'var(--text-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {line.name}
                  </p>
                  <p className="money" style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {formatIDR(line.price)} / item
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'remove', id: line.id })}
                  aria-label={`Hapus ${line.name}`}
                  style={{
                    minWidth: '44px',
                    minHeight: '44px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--color-danger)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-lg)',
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
                {/* Qty stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <QtyButton label="−" ariaLabel={`Kurangi qty ${line.name}`} onClick={() => dispatch({ type: 'setQty', id: line.id, qty: line.qty - 1 })} />
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={line.qty}
                    onChange={(e) => dispatch({ type: 'setQty', id: line.id, qty: Number(e.target.value) || 1 })}
                    aria-label={`Qty ${line.name}`}
                    style={{ width: '64px', textAlign: 'center' }}
                  />
                  <QtyButton label="+" ariaLabel={`Tambah qty ${line.name}`} onClick={() => dispatch({ type: 'setQty', id: line.id, qty: line.qty + 1 })} />
                </div>

                {/* Discount per item */}
                <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: '1 1 120px', minWidth: 0 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Diskon (Rp)</span>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={line.discount}
                    onChange={(e) => dispatch({ type: 'setDiscount', id: line.id, discount: Math.max(0, Number(e.target.value) || 0) })}
                    aria-label={`Diskon ${line.name}`}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
                <span className="money" style={{ fontWeight: 700 }}>{formatIDR(lineSubtotal(line))}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingTop: 'var(--space-2)' }}>
        <SummaryRow label="Subtotal" value={formatIDR(subtotal)} />
        <SummaryRow label="Total Diskon" value={formatIDR(discountTotal)} />
        <SummaryRow label="Pajak" valueText="dihitung server" muted />
        <div style={{ height: '1px', background: 'var(--color-border)', margin: 'var(--space-1) 0' }} />
        <SummaryRow label="Total" value={formatIDR(total)} strong />
      </div>

      {/* Customer + payment selects */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <span style={labelStyle}>Pelanggan (opsional)</span>
        <select
          className="input"
          value={customerId ?? ''}
          onChange={(e) => onCustomerChange(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Tanpa pelanggan</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.phone ? ` — ${c.phone}` : ''}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <span style={labelStyle}>Metode Bayar</span>
        <select
          className="input"
          value={paymentTypeId ?? ''}
          onChange={(e) => onPaymentTypeChange(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Pilih metode bayar…</option>
          {activePayments.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {paymentError && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>
            Gagal memuat metode bayar
          </span>
        )}
      </label>

      {/* Payment amount + change */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <span style={labelStyle}>Jumlah Bayar (Rp)</span>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          min={0}
          value={paymentAmount}
          onChange={(e) => onPaymentAmountChange(e.target.value)}
          placeholder="0"
          aria-label="Jumlah bayar"
        />
      </label>

      <SummaryRow
        label="Kembalian"
        value={formatIDR(change)}
        strong
        accent={change >= 0 && paymentAmount !== ''}
      />

      {errorMessage && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {errorMessage}
        </p>
      )}

      <button
        type="button"
        className="btn"
        onClick={onPay}
        disabled={!canPay || isSubmitting}
        style={{
          width: '100%',
          fontSize: 'var(--text-base)',
          opacity: !canPay || isSubmitting ? 0.55 : 1,
          cursor: !canPay || isSubmitting ? 'not-allowed' : 'pointer',
        }}
      >
        {isSubmitting ? 'Memproses…' : `Bayar ${formatIDR(total)}`}
      </button>
    </section>
  );
}

function SummaryRow({
  label,
  value,
  valueText,
  strong,
  muted,
  accent,
}: {
  label: string;
  value?: string;
  valueText?: string;
  strong?: boolean;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-4)' }}>
      <span
        style={{
          fontSize: strong ? 'var(--text-base)' : 'var(--text-sm)',
          fontWeight: strong ? 700 : 400,
          color: 'var(--color-text-muted)',
        }}
      >
        {label}
      </span>
      {valueText ? (
        <span style={{ fontSize: 'var(--text-sm)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
          {valueText}
        </span>
      ) : (
        <span
          className="money"
          style={{
            fontSize: strong ? 'var(--text-lg)' : 'var(--text-sm)',
            fontWeight: strong ? 800 : 500,
            color: accent ? 'var(--color-success)' : muted ? 'var(--color-text-muted)' : 'var(--color-text)',
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
}
