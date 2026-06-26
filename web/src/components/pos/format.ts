/**
 * Format uang IDR (tanpa desimal). Dipakai bersama class .money (monospace).
 */
const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function formatIDR(value: number): string {
  return idrFormatter.format(Number.isFinite(value) ? value : 0);
}

/** receipt server berisi string "0.00" → tampilkan sebagai IDR. */
export function formatIDRFromString(value: string): string {
  return formatIDR(Number(value));
}
