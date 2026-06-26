'use client';

import { useMemo, useReducer, useState } from 'react';
import { apiMutate, FetchError } from '@/lib/fetcher';
import { cartReducer } from '@/components/pos/cartReducer';
import { ProductPanel } from '@/components/pos/ProductPanel';
import { CartPanel } from '@/components/pos/CartPanel';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import type { PosItem, TransactionReceipt, TransactionResponse } from '@/components/pos/types';

type SuccessState = {
  transactionId: string;
  receipt: TransactionReceipt;
};

export default function PosPage() {
  const [lines, dispatch] = useReducer(cartReducer, []);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [paymentTypeId, setPaymentTypeId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState<SuccessState | null>(null);

  // Ringkasan (preview klien). Pajak TIDAK dihitung di klien — biarkan server.
  const { subtotal, discountTotal, total } = useMemo(() => {
    const sub = lines.reduce((acc, line) => acc + line.price * line.qty, 0);
    const disc = lines.reduce((acc, line) => acc + line.discount, 0);
    return { subtotal: sub, discountTotal: disc, total: Math.max(0, sub - disc) };
  }, [lines]);

  const payNum = Number(paymentAmount);
  const paymentValid = paymentAmount !== '' && Number.isFinite(payNum) && payNum >= 0;
  const change = paymentValid ? payNum - total : 0;

  const canPay =
    lines.length > 0 && paymentTypeId !== null && paymentValid && payNum >= total && total > 0;

  function handlePick(item: PosItem) {
    setErrorMessage('');
    dispatch({ type: 'add', item });
  }

  async function handlePay() {
    if (!canPay || isSubmitting || paymentTypeId === null) return;
    setIsSubmitting(true);
    setErrorMessage('');

    // idempotencyKey sekali per attempt (anti double-submit di server).
    const idempotencyKey = crypto.randomUUID();
    const body = {
      items: lines.map((line) => ({
        id: line.id,
        price: line.price,
        qty: line.qty,
        discount: line.discount,
      })),
      payment_type_id: paymentTypeId,
      payment_amount: payNum,
      ...(customerId !== null ? { customer_id: customerId } : {}),
      idempotencyKey,
    };

    try {
      const res = await apiMutate<TransactionResponse>('/api/sales/transactions', 'POST', body);
      if (!res.receipt) {
        // Replay idempoten tanpa receipt — anggap sudah diproses sebelumnya.
        setErrorMessage('Transaksi sudah diproses sebelumnya.');
        return;
      }
      setSuccess({ transactionId: res.transaction_id, receipt: res.receipt });
    } catch (err: unknown) {
      if (err instanceof FetchError) {
        if (err.status === 401 || err.status === 403) {
          setErrorMessage('Sesi tidak valid atau akses ditolak. Silakan masuk ulang.');
        } else {
          setErrorMessage(err.message || 'Gagal memproses transaksi.');
        }
      } else {
        setErrorMessage('Terjadi kesalahan tak terduga.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNewTransaction() {
    dispatch({ type: 'clear' });
    setCustomerId(null);
    setPaymentTypeId(null);
    setPaymentAmount('');
    setErrorMessage('');
    setSuccess(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-1)' }}>
          Kasir
        </h1>
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          Pilih produk, atur keranjang, lalu proses pembayaran.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
        <ProductPanel onPick={handlePick} />
        <CartPanel
          lines={lines}
          dispatch={dispatch}
          customerId={customerId}
          onCustomerChange={setCustomerId}
          paymentTypeId={paymentTypeId}
          onPaymentTypeChange={setPaymentTypeId}
          paymentAmount={paymentAmount}
          onPaymentAmountChange={setPaymentAmount}
          subtotal={subtotal}
          discountTotal={discountTotal}
          total={total}
          change={change}
          canPay={canPay}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          onPay={handlePay}
        />
      </div>

      {success && (
        <ReceiptModal
          transactionId={success.transactionId}
          receipt={success.receipt}
          onNew={handleNewTransaction}
        />
      )}
    </div>
  );
}
