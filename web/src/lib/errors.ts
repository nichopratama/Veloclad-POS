/**
 * Error bisnis dengan status HTTP (mis. stok kurang, pembayaran kurang).
 * Dipakai untuk 4xx yang disengaja — pesan boleh ditampilkan ke klien.
 *
 * Sengaja DIPISAH dari `lib/api.ts` agar bisa diimpor modul murni (mis.
 * `sales-pricing.ts`) tanpa menyeret `next/server`/`next/headers` → modul
 * logika uang tetap bisa di-unit-test dengan Vitest tanpa runtime Next.
 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
