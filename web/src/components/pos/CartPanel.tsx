'use client';

import { useState, useEffect, type Dispatch } from 'react';
import useSWR from 'swr';
import { ShoppingCart, Trash2, Tag } from 'lucide-react';
import { lineSubtotal, type CartAction } from './cartReducer';
import { formatIDR } from './format';
import type { CartLine, Customer, ListResponse, PaymentType } from './types';
import { useLocale } from '@/lib/i18n/LocaleContext';
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

  const { t } = useLocale();
  const [discountVisibleIds, setDiscountVisibleIds] = useState<Record<number, boolean>>({});
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const { data: customersData } = useSWR<ListResponse<Customer>>('/api/library/customers');
  const { data: paymentData, error: paymentError } =
    useSWR<ListResponse<PaymentType>>('/api/library/payment-types');

  const customers = customersData?.data ?? [];
  const activePayments = (paymentData?.data ?? []).filter((p) => p.is_active);

  useEffect(() => {
    if (customerId) {
      const c = customers.find(c => c.id === customerId);
      if (c) setCustomerSearch(c.name);
    } else {
      setCustomerSearch('');
    }
  }, [customerId, customers]);

  const toggleDiscount = (id: number) => {
    setDiscountVisibleIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <section className={`card ${styles.cartPanel}`} aria-label={t.pos.cartLabel} style={{ padding: 0 }}>
      <div className={styles.cartHeader}>
        <ShoppingCart size={20} />
        <h2>{t.pos.cart} ({lines.length})</h2>
      </div>

      <div className={styles.cartItems}>
        {lines.length === 0 ? (
          <div className={styles.emptyCart}>
            {t.pos.emptyCart}
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
                    aria-label={t.pos.reduceQty(line.name)}
                  >
                    −
                  </button>
                  <span className={styles.qtyValue}>{line.qty}</span>
                  <button
                    type="button"
                    className={styles.qtyBtn}
                    onClick={() => dispatch({ type: 'setQty', id: line.id, qty: line.qty + 1 })}
                    aria-label={t.pos.increaseQty(line.name)}
                  >
                    +
                  </button>
                </div>

                <div className={styles.actionBtns}>
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${discountVisibleIds[line.id] ? styles.active : ''}`}
                    onClick={() => toggleDiscount(line.id)}
                    aria-label={t.pos.discountItem(line.name)}
                    title={t.pos.setDiscount}
                  >
                    <Tag size={16} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.danger}`}
                    onClick={() => dispatch({ type: 'remove', id: line.id })}
                    aria-label={t.pos.deleteItem(line.name)}
                    title={t.common.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {discountVisibleIds[line.id] && (
                <div className={styles.discountRow}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{t.pos.discountRp}</span>
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

      <div className={styles.checkoutPanel}>
        <div className={styles.summaryRow}>
          <span>{t.pos.subtotal}</span>
          <span className="money">{formatIDR(subtotal)}</span>
        </div>
        {discountTotal > 0 && (
          <div className={styles.summaryRow}>
            <span>{t.pos.totalDiscount}</span>
            <span className="money">-{formatIDR(discountTotal)}</span>
          </div>
        )}
        <div className={styles.summaryRow}>
          <span>{t.pos.tax}</span>
          <span style={{ fontStyle: 'italic' }}>{t.pos.taxServerCalc}</span>
        </div>

        <div className={styles.totalRow}>
          <span>{t.pos.grandTotal}</span>
          <span className="money">{formatIDR(total)}</span>
        </div>

        <div className={styles.paymentForm}>
          <span className={styles.paymentLabel}>{t.pos.customerOptional}</span>
          <div style={{ position: 'relative', marginBottom: 'var(--space-2)' }}>
            <input
              className="input"
              type="text"
              placeholder={t.pos.noCustomer}
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setShowCustomerDropdown(true);
                if (e.target.value === '') {
                  onCustomerChange(null);
                }
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
            />
            {showCustomerDropdown && (
              <ul style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                maxHeight: '150px',
                overflowY: 'auto',
                zIndex: 10,
                listStyle: 'none',
                padding: 0,
                margin: 0,
                boxShadow: 'var(--shadow-sm)'
              }}>
                {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch)).map(c => (
                  <li
                    key={c.id}
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}
                    onClick={() => {
                      onCustomerChange(c.id);
                      setCustomerSearch(c.name);
                      setShowCustomerDropdown(false);
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>{c.name}</div>
                    {c.phone && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{c.phone}</div>}
                  </li>
                ))}
                {customerSearch && customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch)).length === 0 && (
                  <li style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--color-text-muted)' }}>Tidak ditemukan</li>
                )}
              </ul>
            )}
          </div>

          <span className={styles.paymentLabel}>{t.pos.paymentMethod}</span>
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
              {t.pos.loadPaymentError}
            </span>
          )}

          <span className={styles.paymentLabel}>{t.pos.paymentAmount}</span>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            value={paymentAmount ? new Intl.NumberFormat('id-ID').format(Number(paymentAmount)) : ''}
            onChange={(e) => {
              const rawValue = e.target.value.replace(/\\D/g, '');
              onPaymentAmountChange(rawValue);
            }}
            placeholder="0"
          />
        </div>

        <div className={styles.summaryRow} style={{ marginTop: 'var(--space-2)' }}>
          <span style={{ fontWeight: 600 }}>{t.pos.change}</span>
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
          {isSubmitting ? t.pos.processing : t.pos.processPayment}
        </button>
      </div>
    </section>
  );
}
