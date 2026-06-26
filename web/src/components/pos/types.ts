/**
 * Tipe domain POS / Kasir. Sumber kebenaran tipe untuk halaman & komponen.
 */

export type PosItem = {
  id: number;
  name: string;
  code: string;
  price: string | number;
  stock: number;
};

export type Customer = {
  id: number;
  name: string;
  phone?: string;
};

export type PaymentType = {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
};

/** Satu baris keranjang (client state, BUKAN server state). */
export type CartLine = {
  id: number;
  name: string;
  price: number; // sudah di-parse Number() dari Decimal
  qty: number;
  discount: number; // Rp, per baris, >= 0
  stock: number;
};

/** Respons sukses POST /api/sales/transactions. Nilai receipt = string "0.00". */
export type TransactionReceipt = {
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total: string;
  payment_amount: string;
  change_amount: string;
};

export type TransactionResponse = {
  message: string;
  transaction_id: string;
  receipt?: TransactionReceipt;
  idempotent?: boolean;
};

export type ListResponse<T> = { data: T[] };
