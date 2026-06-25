# M1 — Spesifikasi Integrasi Better Auth (dikerjakan oleh Claude)

> Bagian **reasoning-heavy** dari migrasi (ADR-002). TIDAK di-handoff ke Gemini —
> keputusan di sini kalau salah, mahal (auth + uang + multi-tenant). Gemini baru masuk di M2.

## 1. Keputusan arsitektur inti

### 1.1 Pemisahan peran: Better Auth = autentikasi, `users` lama = entitas staff
Tabel `users` existing **TIDAK diganti**. Alasannya kritikal:

- `transactions.user_id`, `purchase_orders.user_id`, `stock_adjustments.user_id`, `void_items.executed_by` semuanya **FK integer → `users.id`**.
- Better Auth memakai **id string (uuid/cuid)** untuk user-nya. Mengganti `users` dengan tabel Better Auth akan **memutus semua FK** + data transaksi historis.

**Maka:**
| Peran | Pemilik |
|-------|---------|
| Login, password, **session, revocation, cookie** | **Better Auth** (tabel sendiri) |
| Entitas staff/karyawan (FK target, role bisnis) | **`users` lama** (tetap, int id) |
| Jembatan | relasi 1:1 Better Auth user ↔ `users` staff **via email** |

### 1.2 Lokasi tabel: schema tenant (silo)
Tabel Better Auth (`user`, `session`, `account`, `verification`) dibuat **di schema `tenant_<slug>`** — konsisten dengan datasource Prisma yang sudah di-pin `?schema=`. Tidak ada perubahan model tenant (ADR-001 SILO tetap).

### 1.3 Migrasi password bcrypt (tanpa reset password user)
User existing punya `password_hash` **bcrypt**. Better Auth default-nya scrypt. Strategi **verify-shim + rehash-on-login**:
1. Saat seeding account Better Auth, tandai legacy user.
2. Konfigurasi `emailAndPassword.password.verify` custom: jika hash legacy (bcrypt) → verifikasi pakai `bcryptjs.compare`; jika sudah format Better Auth → verifikasi normal.
3. Setelah login pertama sukses, **re-hash** ke format Better Auth (opsional, bertahap).

Dampak: **user lama tetap login dengan password yang sama**, tanpa reset massal.

## 2. Skema & migrasi (non-destruktif)

- Generate tabel Better Auth via CLI: `npx @better-auth/cli generate` → migration Prisma baru (hanya **menambah** tabel, tak menyentuh tabel existing).
- Tambah `additionalFields` pada user Better Auth: `role` (string), `staffId` (int, ref ke `users.id`). Diisi saat seeding/link.
- **Backup schema tenant sebelum migrate** (Nicho-Brain D11). Migration di-review untuk rollback path.

## 3. Konfigурasi Better Auth (garis besar)

```
betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    password: { hash, verify },   // verify: shim bcrypt legacy → fallback default
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "kasir" },
      staffId: { type: "number", required: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 8,       // 8 jam (samakan dgn JWT lama)
    cookieCache: { enabled: true },
  },
  // rate-limit bawaan Better Auth diaktifkan utk endpoint auth (ganti express-rate-limit)
})
```

Cookie: httpOnly + secure + SameSite (default Better Auth) → **menutup gap token di localStorage**.

## 4. RBAC pasca-Better Auth

- `role` ada di `session.user.role` (dari additionalField, sumber: staff `users.role`).
- Helper `requireRole(...roles)` versi Next.js: baca session server-side, 401 kalau tak login, 403 kalau role tak cocok. Konsep sama dgn `api/src/middleware/rbac.js` (dibawa, bukan dibuang).

## 5. Langkah eksekusi M1 (urut)

1. Backup schema `tenant_vapescrew` (`pg_dump --schema=tenant_vapescrew`).
2. Install `better-auth` + setup `prismaAdapter`.
3. `better-auth generate` → migration tabel auth → `prisma migrate` (review dulu).
4. `prisma db pull` + `prisma generate` ulang agar client tahu tabel baru.
5. Konfig `lib/auth.ts` (server) + `lib/auth-client.ts` (client) + route handler `app/api/auth/[...all]/route.ts`.
6. **Seed script**: untuk tiap baris `users`, buat Better Auth user (email, role, staffId) + account credential dengan hash legacy bcrypt.
7. Implement `requireRole` server util.
8. Halaman login Next.js minimal → test login `admin@tokoabc.local` dengan password existing.
9. Verifikasi: login sukses, session cookie httpOnly, logout men-revoke session (cek di tabel `session`), role terbaca.

## 6. Acceptance criteria M1

- [ ] User existing login dengan password lama (verify bcrypt shim jalan).
- [ ] Session tersimpan di DB, cookie httpOnly+secure+SameSite.
- [ ] Logout menghapus session row (revocation **nyata**).
- [ ] `requireRole` memblok kasir dari aksi admin.
- [ ] Tabel existing & FK transaksi **tidak berubah**.
- [ ] Migration punya rollback path + backup diambil.
- [ ] `npm run build` + `typecheck` hijau.

## 7. Risiko & mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Mismatch id int vs string | Pisah peran: Better Auth (string) utk auth, `users` (int) utk FK; link via email/staffId |
| Migrasi password gagal | Verify-shim bcrypt; tidak hapus `password_hash` lama sampai semua user re-hash |
| Tabel auth bocor ke schema salah | Datasource Prisma sudah di-pin `?schema=tenant_<slug>` |
| Secret placeholder (`.env`) | **Rotate `BETTER_AUTH_SECRET` & DB password** sebelum produksi (D10) |

