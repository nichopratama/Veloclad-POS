# ADR-002 — Migrasi Stack ke Next.js + Prisma + Better Auth

> **Status:** Accepted · **Tanggal:** 2026-06-25 · **Profil:** FULL
> **Pemicu:** kebutuhan auth yang lebih aman (revocation, secure-default) + penyelarasan ke stack default Nicho-Brain (D3).
> **Menggantikan:** asumsi stack di `ADR-001` & `GAP_ANALYSIS_AND_PLAN.md` (Express/Knex/JWT) — model tenant SILO dari ADR-001 **tetap berlaku**.

## 1. Keputusan

Migrasi dari **Express + Knex + JWT manual (JavaScript/CommonJS)** ke **Next.js (App Router, TypeScript) + Prisma + Better Auth + PostgreSQL**.

Alasan:
- **Keamanan auth:** Better Auth memberi session-based auth dengan httpOnly cookie, **revocation seketika**, refresh, dan CSRF secara default — kritikal untuk POS yang pegang uang & multi-user (lihat ADR pembahasan auth).
- **Selaras Nicho-Brain D3:** ini stack default (Next.js, Prisma, Better Auth) → mengurangi deviasi.
- **Better Auth first-class** hanya mulus dengan ORM ber-adapter (Prisma) — sehingga Knex ikut diganti.
- **TypeScript** mengurangi kelas bug yang sekarang tak terdeteksi (JS polos).

## 2. Konsekuensi terhadap pekerjaan yang sudah ada

Sebagian hasil FASE 0 (Express/Knex) bersifat **transisional** dan akan digantikan, TAPI **logika/keputusannya tetap dipakai ulang**:

| Hasil FASE 0 (Express/Knex) | Nasib setelah migrasi |
|------------------------------|------------------------|
| Fix race `search_path` (knexfile afterCreate) | Diganti: Prisma set `search_path` via connection string per deployment (silo) — efek sama, race tetap hilang |
| RBAC `requireRole` | Konsep dipertahankan → middleware/route-guard di Next.js |
| JWT middleware (`auth.js`) | **Dibuang** → diganti session Better Auth |
| pino logging + error handler + `/health` | Di-port ke Next.js (route handler + instrumentation) |
| rate-limit `/login` | Di-port (Better Auth punya hook rate-limit sendiri) |
| Zod env fail-fast | Dipertahankan (Zod env tetap relevan) |
| Quick Wins: helmet/CORS | Diganti config Next.js (headers di `next.config` / middleware) |

> Tidak ada usaha FASE 0 yang sia-sia: ia menstabilkan sistem **selama transisi** (strangler) dan keputusannya (RBAC, isolasi tenant, no-leak) berpindah konsep.

## 3. Tantangan kunci: Multi-tenancy dengan Prisma

ADR-001 memilih **SILO (1 schema per deployment)**. Dengan Prisma ini **justru bersih**:

- Set schema lewat **connection string** datasource: `...?schema=tenant_x` (Prisma mendukung parameter `schema`), atau `search_path` via `options=-c search_path=tenant_x`.
- Satu `PrismaClient` per deployment, ter-pin ke schema tenant → **tak ada race** (sama amannya dengan fix afterCreate, tapi native).
- `schema.prisma` cukup satu; schema fisik per tenant dibuat saat provisioning (FASE 6).

> Jika kelak pindah ke model **Pooled** (ADR-001 Opsi B, >20 tenant), barulah pertimbangkan discriminator `tenantId` column atau multi-client. Itu di luar scope ADR ini.

## 4. Strategi migrasi: Strangler (bukan big-bang)

Sistem POS **tetap jalan** selama migrasi; route dipindah satu per satu, bukan rewrite sekaligus.

### Tahap M0 — Scaffolding (non-destruktif)
- Scaffold app Next.js (App Router + TS) di folder baru (mis. `web/`), tidak menyentuh `api/`/`frontend/` lama.
- Setup Prisma → **introspeksi DB yang sudah ada** (`prisma db pull`) untuk generate `schema.prisma` dari 16 tabel existing (reuse data, tanpa migrasi destruktif).
- Setup Better Auth + adapter Prisma.

### Tahap M1 — Auth (Better Auth)
- Definisikan tabel user/session Better Auth (selaraskan dengan tabel `users` existing — mungkin migrasi/mapping password hash bcrypt).
- Implement login/logout/session + RBAC (role dari user) + rate-limit.
- Verifikasi end-to-end dengan DB berjalan.

### Tahap M2 — Port API (per modul, strangler)
- Pindahkan route → Next.js Route Handlers / Server Actions, urut: `auth → library → sales → inventory → dashboard → settings`.
- Pakai Prisma + **Zod validation** (carry over rencana FASE 1).
- Selama transisi, route yang belum dipindah tetap dilayani Express (reverse-proxy memilah).

### Tahap M3 — Frontend
- Opsi: pertahankan komponen React existing, pindahkan ke Next.js App Router secara bertahap (FE Vite lama tetap jalan sampai paritas tercapai).

### Tahap M4 — Cutover & decommission
- Setelah semua modul paritas + teruji, matikan Express/Knex; hapus `api/` lama.
- Update Docker Compose & CI untuk stack baru.

## 5. Risiko & mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Rewrite besar memakan waktu | Strangler: nilai bertahap, POS lama tetap jalan |
| Mapping password bcrypt → Better Auth | Better Auth mendukung verifikasi bcrypt / migrasi saat login pertama |
| Prisma + schema-per-tenant kurang lazim | Sudah divalidasi: schema via connection string (silo) |
| Regресi fitur | Port modul = + test (FASE 1) sebagai jaring |
| Effort ganda (2 stack saat transisi) | Batasi window transisi; prioritaskan modul auth & sales |

## 6. Estimasi kasar

| Tahap | Fokus | Estimasi |
|-------|-------|----------|
| M0 | Scaffold Next+Prisma+BetterAuth, introspeksi DB | 1 hari |
| M1 | Auth Better Auth + RBAC + session | 1–2 hari |
| M2 | Port 6 modul API + Zod + Prisma | 3–4 hari |
| M3 | Frontend ke Next.js | 2–3 hari |
| M4 | Cutover, Docker/CI, decommission | 1 hari |
| | **Total** | **±8–11 hari kerja** |

## 7. Dampak ke roadmap

- Rencana FASE 1–6 di `GAP_ANALYSIS_AND_PLAN.md` **dipetakan ulang** ke stack baru: validasi/test (FASE 1), promosi (FASE 2), dst dikerjakan **di Next.js/Prisma**, bukan Express/Knex.
- ADR-001 (model tenant SILO) **tetap berlaku**; mekanismenya kini via Prisma connection string.
- Auth = Better Auth → menutup gap "token di localStorage", "no revocation", "no refresh" sekaligus.

## 8. Checklist Eksekusi

> Status per 2026-06-26. ✅ selesai & tervalidasi · 🔄 berjalan · ⬜ belum.
> Pelaksana: **C** = Claude (reasoning/review) · **G** = Gemini/Deputi Mipro (implementasi mekanis).

### Tahap M0 — Scaffolding ✅
- [x] Scaffold Next.js (App Router + TS) di `web/` (C)
- [x] Setup Prisma + introspeksi DB existing → `schema.prisma` (19 model) (C)
- [x] Validasi multi-tenant silo via `?schema=` (query data nyata) (C)
- [x] Prisma singleton, Zod env fail-fast, security headers, `/health` + `/health/ready` (C)
- [x] Build + runtime tervalidasi (C)

### Tahap M1 — Auth (Better Auth) ✅
- [x] Backup schema tenant sebelum migrasi (C)
- [x] Install Better Auth 1.6.20 + `prismaAdapter` (C)
- [x] Generate 4 tabel auth (user/session/account/verification) — SQL additif, non-destruktif (C)
- [x] Keputusan: `users` lama = staff (FK target); Better Auth = auth; link via email+`staffId` (C)
- [x] Password bcrypt verify-shim (user lama login tanpa reset) (C)
- [x] `lib/auth.ts`, `lib/auth-client.ts`, route `api/auth/[...all]`, seed migrasi user (C)
- [x] `lib/rbac.ts` (`requireAuth`/`requireRole`) (C)
- [x] Tervalidasi: login bcrypt, pwd salah 401, cookie httpOnly, CSRF, session DB-backed (revocation), cascade (C)
- [ ] Login UI minimal → **ditunda ke M3**

### Tahap M2 — Port API per modul ✅
- [x] `library` — 6 entitas CRUD (G) · fix review: query-param null→undefined (C)
- [x] `inventory` — stock-summary/PO/receive/adjustments (G) · fix: po_number race→random hex (C)
- [x] `sales` — pos-items/transactions/void: Decimal, anti-oversell race-safe, idempotency, void (C)
- [x] Prasyarat sales: kolom `transaction_items.discount` + `transactions.idempotency_key` (additif) (C)
- [x] `dashboard` — summary/sales-chart/top-items (G) · fix: raw SQL→Prisma `groupBy` (C)
- [x] `settings` — store get/put (G) · lulus tanpa fix
- [x] Helper bersama `lib/api.ts` (handleApiError + ApiError) (C)
- [x] Tiap modul: typecheck + build + runtime test + review-gate (C)

### Tahap M3 — Frontend ⬜
- [ ] Spec handoff M3 per-halaman (C)
- [ ] Setup UI shell Next.js (layout, navigasi, AuthProvider via Better Auth client) (C/G)
- [ ] Halaman Login (Better Auth `signIn`, ganti localStorage JWT) (G)
- [ ] Halaman Dashboard (summary/chart/top-items) (G)
- [ ] Halaman Sales/POS (kasir, cart, checkout, struk) (G)
- [ ] Halaman Sales History + void (G)
- [ ] Halaman Inventory (stock summary, PO, adjustments) (G)
- [ ] Halaman Library (items/categories/customers/suppliers/payment-types/discounts) (G)
- [ ] Halaman Settings (store/tax/receipt) (G)
- [ ] Guard route by session + role (C)
- [ ] Review + gate tiap halaman (C)

### Tahap M4 — Cutover & decommission ⬜
- [ ] Set `BETTER_AUTH_URL` + CORS ke origin nyata (port 3020) (C)
- [ ] Dockerfile + compose untuk app Next.js (C/G)
- [ ] Alihkan port 3020 (reverse-proxy) dari frontend lama → Next.js (C)
- [ ] Update CI (`.github/workflows`) ke stack baru (C)
- [ ] Rotate secret placeholder (`DB_PASSWORD`, `BETTER_AUTH_SECRET`) (C)
- [ ] Verifikasi paritas penuh di staging → matikan `api/` & `frontend/` lama (C)
- [ ] Hapus stack lama (Express/Knex/Vite) setelah stabil (C)

