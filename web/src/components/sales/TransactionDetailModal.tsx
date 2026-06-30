'use client';

import { useState } from 'react';
import { Transaction } from './types';
import { formatIDRFromString } from '@/components/pos/format';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { useLocale } from '@/lib/i18n/LocaleContext';

interface TransactionDetailModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export function TransactionDetailModal({ transaction, onClose }: TransactionDetailModalProps) {
  const [showReceipt, setShowReceipt] = useState(false);
  const { t } = useLocale();

  if (showReceipt) {
    return (
      <div style={{ position: 'relative', zIndex: 60 }}>
        <ReceiptModal
          transactionId={transaction.id}
          receipt={{
            subtotal: transaction.subtotal,
            discount_amount: transaction.discount_amount,
            tax_amount: transaction.tax_amount,
            total: transaction.total,
            payment_amount: transaction.payment_amount,
            change_amount: transaction.change_amount,
          }}
          onNew={() => setShowReceipt(false)}
        />
        <div style={{ position: 'fixed', bottom: 'var(--space-4)', left: '50%', transform: 'translateX(-50%)', zIndex: 70 }}>
          <button className="btn btn--ghost" onClick={() => setShowReceipt(false)} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {t.sales.backToDetail}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
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
          width: 'min(100%, 600px)',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--color-accent)', margin: 0 }}>{t.sales.transactionDetail}</h2>
          <button className="btn btn--outline" onClick={onClose} type="button">{t.common.close}</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
            <div><strong>ID:</strong> {transaction.id}</div>
            <div><strong>{t.sales.date}:</strong> {new Date(transaction.created_at).toLocaleString('id-ID')}</div>
            <div><strong>{t.sales.cashier}:</strong> {transaction.cashier_name}</div>
            <div><strong>{t.sales.paymentMethod}:</strong> {transaction.payment_method || '-'}</div>
            <div><strong>{t.sales.status}:</strong> {transaction.status}</div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>{t.sales.purchasedItems}</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: 'var(--space-2)' }}>{t.sales.itemName}</th>
                  <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>{t.sales.unitPrice}</th>
                  <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>{t.sales.qty}</th>
                  <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>{t.sales.discount}</th>
                  <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>{t.sales.subtotal}</th>
                </tr>
              </thead>
              <tbody>
                {transaction.items_detail.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 'var(--space-2)' }}>{item.items.name}</td>
                    <td className="money" style={{ padding: 'var(--space-2)', textAlign: 'right' }}>{formatIDRFromString(item.price)}</td>
                    <td style={{ padding: 'var(--space-2)', textAlign: 'right' }}>{item.qty}</td>
                    <td className="money" style={{ padding: 'var(--space-2)', textAlign: 'right' }}>{formatIDRFromString(item.discount)}</td>
                    <td className="money" style={{ padding: 'var(--space-2)', textAlign: 'right' }}>{formatIDRFromString(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {transaction.voided_items && transaction.voided_items.length > 0 && (
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-danger)' }}>{t.sales.voidedItems}</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: 'var(--space-2)' }}>{t.sales.itemName}</th>
                    <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>{t.sales.qty}</th>
                    <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>{t.sales.refund}</th>
                    <th style={{ padding: 'var(--space-2)' }}>{t.sales.reason}</th>
                    <th style={{ padding: 'var(--space-2)' }}>{t.sales.by}</th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.voided_items.map((vItem, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: 'var(--space-2)' }}>{vItem.items.name}</td>
                      <td style={{ padding: 'var(--space-2)', textAlign: 'right' }}>{vItem.qty}</td>
                      <td className="money" style={{ padding: 'var(--space-2)', textAlign: 'right' }}>{formatIDRFromString(vItem.refund_amount)}</td>
                      <td style={{ padding: 'var(--space-2)' }}>{vItem.reason}</td>
                      <td style={{ padding: 'var(--space-2)' }}>{vItem.users.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => setShowReceipt(true)}>{t.sales.reprintReceipt}</button>
        </div>
      </div>
    </div>
  );
}
