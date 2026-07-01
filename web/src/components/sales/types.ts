export interface TransactionItem {
  item_id: number;
  qty: number;
  price: string;
  discount: string;
  subtotal: string;
  items: { name: string };
}

export interface VoidedItem {
  item_id: number;
  qty: number;
  refund_amount: string;
  reason: string;
  created_at: string;
  items: { name: string };
  users: { name: string };
}

export interface Transaction {
  id: string;
  status: 'completed' | 'void' | 'cancelled';
  created_at: string;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total: string;
  net_sales: string;
  payment_amount: string;
  change_amount: string;
  refunds: string | null;
  cashier_name: string;
  payment_method: string | null;
  items_summary: string;
  items_detail: TransactionItem[];
  voided_items: VoidedItem[];
}

export interface TransactionSummary {
  total_transactions: number;
  total_collected: number;
  net_sales: number;
  status_breakdown?: Record<string, number>;
  payment_breakdown?: { method: string, amount: number }[];
}

export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionsResponse {
  summary: TransactionSummary;
  data: Transaction[];
  pagination: PaginationData;
}

export interface PaymentType {
  id: number;
  name: string;
}

export interface PaymentTypesResponse {
  data: PaymentType[];
}
