import { Prisma } from '@prisma/client';
import { ApiError } from './errors';

/**
 * Logika UANG murni untuk modul sales — tanpa I/O (tak sentuh DB/Next).
 * Diekstrak dari route handler agar invarian uang (pajak inklusif/eksklusif,
 * clamp diskon, pembulatan Decimal, kembalian, refund) terkunci unit-test.
 *
 * Semua perhitungan pakai Prisma.Decimal (hindari galat pembulatan float).
 */
const D = Prisma.Decimal;
type Decimal = Prisma.Decimal;

/** Nilai yang boleh dipakai membentuk Decimal (dari klien/DB). */
type DecimalLike = Prisma.Decimal | number | string;

export interface SaleItemInput {
  id: number;
  qty: number;
  discount: DecimalLike;
}

/** Baris item otoritatif dari DB (harga TIDAK pernah dari klien). */
export interface DbItemRow {
  id: number;
  price: DecimalLike;
  is_active: boolean | null;
}

export interface SaleLine {
  id: number;
  qty: number;
  price: Decimal;
  discount: Decimal;
  lineGross: Decimal;
}

export interface SaleTotals {
  lines: SaleLine[];
  subtotal: Decimal;
  discountTotal: Decimal;
  taxAmount: Decimal;
  total: Decimal;
}

export interface ComputeSaleParams {
  items: SaleItemInput[];
  /** Harga+status otoritatif per item id (hasil lookup DB). */
  itemById: Map<number, DbItemRow>;
  /** Tarif pajak sbg fraksi (mis. 0.11 utk 11%), BUKAN persen. */
  taxRate: Decimal;
  isInclusive: boolean;
}

/**
 * Hitung total transaksi dari harga OTORITATIF DB.
 * Melempar ApiError(400) untuk: item tak ditemukan, item nonaktif, atau
 * diskon baris melebihi subtotal baris (cegah total negatif).
 */
export function computeSale(params: ComputeSaleParams): SaleTotals {
  const { items, itemById, taxRate, isInclusive } = params;

  let subtotal = new D(0);
  let discountTotal = new D(0);

  const lines: SaleLine[] = items.map((it) => {
    const row = itemById.get(it.id);
    if (!row) throw new ApiError(400, `Item ${it.id} tidak ditemukan`);
    if (row.is_active === false) throw new ApiError(400, `Item ${it.id} tidak aktif`);

    const unitPrice = new D(row.price);
    const lineGross = unitPrice.times(it.qty);
    const lineDiscount = new D(it.discount);
    // Clamp diskon ≤ subtotal baris (cegah total negatif via diskon dibuat-buat).
    if (lineDiscount.greaterThan(lineGross)) {
      throw new ApiError(400, `Diskon item ${it.id} melebihi subtotal baris`);
    }

    subtotal = subtotal.plus(lineGross);
    discountTotal = discountTotal.plus(lineDiscount);
    return { id: it.id, qty: it.qty, price: unitPrice, discount: lineDiscount, lineGross };
  });

  const taxable = subtotal.minus(discountTotal);
  let taxAmount: Decimal;
  let total: Decimal;
  if (isInclusive) {
    // Pajak sudah termasuk di harga: total = taxable; pisahkan komponen pajak.
    total = taxable;
    taxAmount = taxable.minus(taxable.div(new D(1).plus(taxRate)));
  } else {
    taxAmount = taxable.times(taxRate);
    total = taxable.plus(taxAmount);
  }

  return { lines, subtotal, discountTotal, taxAmount, total };
}

/**
 * Kembalian = pembayaran − total. Melempar ApiError(400) bila kurang bayar.
 */
export function computeChange(total: Decimal, paymentAmount: Decimal): Decimal {
  if (paymentAmount.lessThan(total)) {
    throw new ApiError(400, 'Jumlah pembayaran kurang dari total');
  }
  return paymentAmount.minus(total);
}

export interface RefundUpdateParams {
  currentRefunds: Decimal;
  netSales: Decimal;
  total: Decimal;
  totalRefund: Decimal;
}

export interface RefundUpdate {
  newRefunds: Decimal;
  newNetSales: Decimal;
  /** True bila akumulasi refund ≥ total transaksi → status jadi 'void'. */
  fullyRefunded: boolean;
}

/**
 * Hitung pembaruan akumulatif saat void/refund sebagian atau penuh.
 */
export function computeRefund(params: RefundUpdateParams): RefundUpdate {
  const { currentRefunds, netSales, total, totalRefund } = params;
  const newRefunds = currentRefunds.plus(totalRefund);
  const newNetSales = netSales.minus(totalRefund);
  const fullyRefunded = newRefunds.greaterThanOrEqualTo(total);
  return { newRefunds, newNetSales, fullyRefunded };
}
