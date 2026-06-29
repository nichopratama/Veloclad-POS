export interface StockItem { 
  id: number; 
  name: string; 
  code: string; 
  stock: number; 
  min_stock: number; 
  price: string; 
  unit: string | null; 
  is_active: boolean;
  categories: { name: string } | null;
  suppliers: { name: string } | null;
  consignment_stock?: number;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  status: string;
  payment_method: string | null;
  payment_status: string | null;
  due_date: string | null;
  total_amount: string;
  notes: string | null;
  created_at: string;
  supplier_id: number;
  consignment_days: number | null;
  suppliers: { name: string } | null;
  users: { name: string } | null;
  po_items?: {
    item_id: number;
    qty: number;
    cost: string | number;
    subtotal: string | number;
    items: { name: string; code: string } | null;
  }[];
}

export interface Adjustment { 
  id: number; 
  item_id: number | null; 
  qty_change: number; 
  reason: string; 
  notes: string | null; 
  created_at: string; 
  items: { name: string } | null; 
  users: { name: string } | null; 
}

export interface PickItem { 
  id: number; 
  name: string; 
  code: string; 
}

export interface PoLine { 
  item_id: number; 
  name: string; 
  qty: number; 
  cost: number; 
}

export interface Supplier {
  id: number;
  name: string;
  consignment_days?: number | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface FlatResponse<T> {
  data: T[];
}
