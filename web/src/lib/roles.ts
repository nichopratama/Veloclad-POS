/**
 * Sumber kebenaran tunggal untuk role aplikasi POS (Nicho-Brain D7).
 *
 * Sistem 2-role:
 *  - `admin` → akses penuh (semua menu).
 *  - `kasir` → label UI "Cashier"; hanya Dashboard + Penjualan (POS Kasir & Riwayat Transaksi).
 *
 * Catatan nilai: string `kasir` DIPERTAHANKAN (data lama & default Better Auth) walau
 * ditampilkan sebagai "Cashier" di UI — hindari migrasi massal.
 *
 * Role lama `owner` SUDAH dilebur ke `admin` (lihat scripts/merge-owner-to-admin.mjs).
 * `isAdmin` sengaja masih menoleransi `owner` sebagai jaring pengaman transisi agar akun
 * owner yang belum termigrasi tidak terkunci; setelah skrip migrasi jalan, toleransi ini
 * menjadi tak terpakai (harmless).
 */
export const ROLE_VALUES = ['admin', 'kasir'] as const;
export type Role = (typeof ROLE_VALUES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  kasir: 'Cashier',
};

/** Role yang dapat dipilih saat membuat/mengubah user (UI + validasi). */
export const ADMIN_ROLES: readonly string[] = ['admin'];

/** True bila role boleh mengakses menu/aksi admin. */
export function isAdmin(role: string | null | undefined): boolean {
  // 'owner' = legacy, dilebur ke 'admin' oleh skrip migrasi; ditoleransi sbg pengaman.
  return role === 'admin' || role === 'owner';
}

/** Label tampilan untuk sebuah role (fallback ke nilai mentah). */
export function roleLabel(role: string | null | undefined): string {
  if (role && role in ROLE_LABELS) return ROLE_LABELS[role as Role];
  return role ?? '-';
}

/**
 * Pengaman anti-lockout: true bila operasi akan menghapus admin TERAKHIR.
 * - Hapus user  → panggil tanpa `newRole` (target kehilangan admin bila ber-role admin).
 * - Ubah role   → `newRole` = role baru (kehilangan admin bila admin→non-admin).
 */
export function wouldRemoveLastAdmin(
  currentAdminCount: number,
  targetRole: string | null | undefined,
  newRole?: string,
): boolean {
  const losesAdmin =
    newRole === undefined ? isAdmin(targetRole) : isAdmin(targetRole) && !isAdmin(newRole);
  return losesAdmin && currentAdminCount <= 1;
}
