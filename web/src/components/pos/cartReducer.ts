/**
 * Reducer keranjang POS. State keranjang = client state murni (useReducer).
 * Immutable: setiap action mengembalikan array baris baru, tidak mutasi in-place.
 */
import type { CartLine, PosItem } from './types';

export type CartAction =
  | { type: 'add'; item: PosItem }
  | { type: 'setQty'; id: number; qty: number }
  | { type: 'setDiscount'; id: number; discount: number }
  | { type: 'remove'; id: number }
  | { type: 'clear' };

function toPrice(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function cartReducer(state: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case 'add': {
      const existing = state.find((line) => line.id === action.item.id);
      if (existing) {
        // Tambah qty, jangan melebihi stok.
        const nextQty = Math.min(existing.qty + 1, Math.max(action.item.stock, 1));
        return state.map((line) =>
          line.id === action.item.id ? { ...line, qty: nextQty } : line,
        );
      }
      const newLine: CartLine = {
        id: action.item.id,
        name: action.item.name,
        price: toPrice(action.item.price),
        qty: 1,
        discount: 0,
        stock: action.item.stock,
      };
      return [...state, newLine];
    }

    case 'setQty': {
      const qty = Math.max(1, Math.floor(action.qty));
      return state.map((line) =>
        line.id === action.id
          ? { ...line, qty: Math.min(qty, Math.max(line.stock, 1)) }
          : line,
      );
    }

    case 'setDiscount': {
      const discount = Math.max(0, action.discount);
      return state.map((line) =>
        line.id === action.id ? { ...line, discount } : line,
      );
    }

    case 'remove':
      return state.filter((line) => line.id !== action.id);

    case 'clear':
      return [];

    default:
      return state;
  }
}

/** Subtotal satu baris = price*qty − discount (tidak negatif). */
export function lineSubtotal(line: CartLine): number {
  return Math.max(0, line.price * line.qty - line.discount);
}
