'use client';

import { useState, type Dispatch } from 'react';
import useSWR from 'swr';
import { ShoppingCart, Trash2, Tag } from 'lucide-react';
import { lineSubtotal, type CartAction } from './cartReducer';
import { formatIDR } from './format';
import type { CartLine, Customer, ListResponse, PaymentType } from './types';
import styles from './CartPanel.module.css';

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

  const [discountVisibleIds, setDiscountVisibleIds] = useState<Record<number, boolean>>({});

  const { data: customersData } = useSWR<ListResponse<Customer>>('/api/library/customers');
  const { data: paymentData, error: paymentError } =
    useSWR<ListResponse<PaymentType>>('/api/library/payment-types');

  const customers = customersData?.data ?? [];
  const activePayments = (paymentData?.data ?? []).filter((p) => p.is_active);

  const toggleDiscount = (id: number) => {
    setDiscountVisibleIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <section className={`card ${styles.cartPanel}`} aria-label="Keranjang dan pembayaran" style={{ padding: 0 }}>
      {/* Header */}
      <div className={styles.cartHeader}>
        <ShoppingCart size={20} />
        <h2>Keranjang ({lines.length})</h2>
      </div>

      {/* Cart lines */}
      <div className={styles.cartItems}>
        {lines.length === 0 ? (
          <div className={styles.emptyCart}>
            Keranjang masih kosong. Pilih produk dari panel kiri.
          </div>
        ) : (
          lines.map((line) => (
            <div key={line.id} className={styles.cartItem}>
              <div className={styles.cartItemInfo}>
                <p className={styles.cartItemName}>{line.name}</p>
                <span className={`money ${styles.cartItemPrice}`}>
                  {formatIDR(lineSubtotal(line))}
                </span>
              </div>

              <div className={styles.cartItemActions}>
                <div className={styles.qtyControl}>
                  <button 
                    type="button"
                    className={styles.qtyBtn} 
                    onClick={() => dispatch({ type: 'setQty', id: line.id, qty: line.qty - 1 })}
                    aria-label={`Kurangi qty ${line.name}`}
                  >
                    −
                  </button>
                  <span className={styles.qtyValue}>{line.qty}</span>
                  <button 
                    type="button"
                    className={styles.qtyBtn} 
                    onClick={() => dispatch({ type: 'setQty', id: line.id, qty: line.qty + 1 })}
                    aria-label={`Tambah qty ${line.name}`}
                  >
                    +
                  </button>
                </div>

                <div className={styles.actionBtns}>
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${discountVisibleIds[line.id] ? styles.active : ''}`}
                    onClick={() => toggleDiscount(line.id)}
                    aria-label={`Diskon ${line.name}`}
                    title="Atur Diskon"
                  >
                    <Tag size={16} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.danger}`}
                    onClick={() => dispatch({ type: 'remove', id: line.id })}
                    aria-label={`Hapus ${line.name}`}
                    title="Hapus Item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {discountVisibleIds[line.id] && (
                <div className={styles.discountRow}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Diskon (Rp):</span>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={line.discount}
                    onChange={(e) => dispatch({ type: 'setDiscount', id: line.id, discount: Math.max(0, Number(e.target.value) || 0) })}
                    style={{ minHeight: '30px', fontSize: 'var(--text-sm)', padding: '0 var(--space-2)' }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Checkout Panel */}
      <div className={styles.checkoutPanel}>
        <div className={styles.summaryRow}>
          <span>Subtotal</span>
          <span className="money">{formatIDR(subtotal)}</span>
        </div>
        {discountTotal > 0 && (
          <div className={styles.summaryRow}>
            <span>Total Diskon</span>
            <span className="money">-{formatIDR(discountTotal)}</span>
          </div>
        )}
        <div className={styles.summaryRow}>
          <span>Pajak</span>
          <span style={{ fontStyle: 'italic' }}>dihitung server</span>
        </div>
        
        <div className={styles.totalRow}>
          <span>Total Bayar</span>
          <span className="money">{formatIDR(total)}</span>
        </div>

        <div className={styles.paymentForm}>
          {/* Customer select (Optional) */}
          <span className={styles.paymentLabel}>Pelanggan (opsional)</span>
          <select
            className="input"
            value={customerId ?? ''}
            onChange={(e) => onCustomerChange(e.target.value ? Number(e.target.value) : null)}
            style={{ marginBottom: 'var(--space-2)' }}
          >
            <option value="">Tanpa pelanggan</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `— ${c.phone}` : ''}
              </option>
            ))}
          </select>

          {/* Payment Method Grid */}
          <span className={styles.paymentLabel}>Metode Pembayaran</span>
          <div className={styles.paymentGrid}>
            {activePayments.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.paymentBox} ${paymentTypeId === p.id ? styles.active : ''}`}
                aria-pressed={paymentTypeId === p.id}
                onClick={() => onPaymentTypeChange(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
          {paymentError && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>
              Gagal memuat metode bayar
            </span>
          )}

          {/* Amount input */}
          <span className={styles.paymentLabel}>Jumlah Bayar (Rp)</span>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min={0}
            value={paymentAmount}
            onChange={(e) => onPaymentAmountChange(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className={styles.summaryRow} style={{ marginTop: 'var(--space-2)' }}>
          <span style={{ fontWeight: 600 }}>Kembalian</span>
          <span className="money" style={{ fontWeight: 700, color: (change >= 0 && paymentAmount !== '') ? 'var(--color-success)' : 'inherit' }}>
            {formatIDR(change)}
          </span>
        </div>

        {errorMessage && (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: 'var(--space-2)',
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
            marginTop: 'var(--space-2)',
            opacity: !canPay || isSubmitting ? 0.55 : 1,
            cursor: !canPay || isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Memproses…' : 'Proses Pembayaran'}
        </button>
      </div>
    </section>
  );
}
