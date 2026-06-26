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

#### Pelaksana, model & jenis task (Nicho-Brain D8)

| Kode | Aktor | Model | Tier D8 | Jenis task yang dikerjakan |
|------|-------|-------|---------|----------------------------|
| **C** | Claude | **Opus 4.8** (`claude-opus-4-8`) | Reasoning + Code/Security Review | Plan & ADR, keputusan arsitektur (model tenant, desain auth), implementasi modul **kritikal/uang/keamanan** (sales: Decimal, anti-oversell, idempotency; M4: price-tampering, rotate secret, sekuens cutover), serta **seluruh review + quality-gate** tiap modul (D6/D7). Juga M0 scaffold & M1 auth. |
| **G** | Deputi Mipro | **Gemini 3.1 Pro (High)** | Implementation | Implementasi **mekanis & ter-spesifikasi**: port API (M2), halaman config-driven (M3), IaC/config (M4: Dockerfile/compose, CI YAML, nginx). Jalan di window Gemini, **konfirmasi user dulu**. |
| **S** | Deputi Sonet | **Sonnet 4.6** (`claude-sonnet-4-6`) | Implementation | Implementasi mid-kompleksitas via **subagent otomatis**: halaman frontend (M3 dashboard/POS), edit berulang lintas-file (M4: a11y label), verifikasi visual Playwright. |

**Catatan atribusi (jujur):** Pembagian ini mengikuti alur handoff yang disepakati (mekanis → G, reasoning/kritikal/review → C). Model **G** dikonfirmasi eksplisit oleh user sebagai **Gemini 3.1 Pro (High) "Deputi Mipro"** untuk modul **dashboard**; modul **library** & **inventory** diatribusikan ke **G** berdasarkan alur handoff yang sama (model spesifik tidak dinyatakan eksplisit saat itu). Modul **sales** dan semua **review-fix** dikerjakan oleh **C (Opus 4.8)**.

> Selaras Model-Availability Clause D8: tier *Implementation* dilayani Gemini 3.1 Pro; tier *Reasoning* + *Code/Security Review* dipegang Opus 4.8 (yang juga mengambil Implementation untuk modul uang karena deteksi bug-logika tak boleh diturunkan ke tier termurah).

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

### Tahap M3 — Frontend ✅
- [x] Spec handoff M3 per-halaman → `docs/M3-handoff-frontend.md` (Opus)
- [x] App shell: middleware guard + design tokens + SWR provider/fetcher + layout (Sidebar+Header role-gated) (Opus) — runtime tervalidasi
- [x] Halaman Login fungsional (Better Auth `signIn`, no localStorage) (Opus) — polesan visual opsional ke Sonet
- [x] Halaman Dashboard (summary/chart recharts/top-items toggle) — **Deputi Sonet (Sonnet 4.6)**, review Opus lulus
- [x] Halaman Sales/POS (kasir, cart, checkout, struk) — **Deputi Sonet (Sonnet 4.6)**, review Opus lulus (typecheck+build+runtime: checkout/idempotency/oversell tervalidasi)
- [x] Halaman Sales History + void (list+filter+paginasi+ringkasan, detail+cetak ulang, void owner/admin) — **Deputi Mipro (Gemini 3.1 Pro)**, review+gate Opus lulus (typecheck+build hijau; runtime: SSR 200, list shape+summary, filter, void stok-balik+status void tervalidasi; fix Opus: buang `as any` + `catch any`→`FetchError`)
- [x] Halaman Inventory (3 tab: stock-summary paginated+low-stock, PO list+buat+terima, adjustments list+buat) — **Deputi Mipro (Gemini 3.1 Pro)**, review+gate Opus lulus (typecheck+build hijau /inventory 5.12kB; runtime: SSR 3 tab, PO create→receive stok+3, double-receive 400, adjustment −2 stok−2, qty0 ditolak, uang string; fix Opus: 1 token CSS salah `--color-background-muted`→`--color-surface-2`). **Implementasi terbersih: nol `any`.**
- [x] Halaman Library (6 entitas, config-driven: EntityManager+EntityFormModal+FieldInput+entityConfigs) — **Deputi Mipro (Gemini 3.1 Pro)**, review+gate Opus lulus (typecheck+build hijau /library 3.54kB; runtime: SSR+tab, categories+items CRUD, FK+uang string+nested+paginasi+delete tervalidasi; fix Opus: 12 `any`→tipe nyata FormValue/EntityRow/LibraryListResponse + buang dead-code). Catatan: dup item code balik 500 bukan 400 = **bug M2 P2002** (meta.target=field bukan constraint), di luar scope M3, jadwalkan M4 hardening.
- [x] Halaman Settings (store/tax/receipt) — **Deputi Mipro (Gemini 3.1 Pro)**, review+gate Opus lulus (commit `9dff069`; typecheck 0, build hijau /settings 2.19kB; SWR GET objek-flat+PUT, 3 seksi `.card`, email kosong→`null`, tax_rate 0–100, RBAC UI read-only non-admin, banner sukses/error no-`alert`; fix Opus 2: `var(--radius-md)` tak ada→`var(--radius)`, `tax_rate` onChange string→parse `Number` di sumber; runtime tipis: auth gate GET/PUT 401 tanpa cookie, `/settings` 307→login — full owner-session PUT tak diuji, kontrak GET/PUT lulus saat M2)
- [x] Review + gate tiap halaman (Opus)

> **M3 SELESAI 100%** — 6 halaman merged: login, dashboard, POS/kasir, sales history+void, library, inventory, settings. Verifikasi visual penuh (browser) belum; sejauh ini SSR + API + build + auth-gate checks.

> Catatan model: Sonet/Haiku dijalankan via **subagent otomatis**; Mipro/Miflash (Gemini) **dikonfirmasi dulu** ke user lalu dijalankan di window Gemini.

### Tahap M4 — Cutover & decommission ⬜

> **Spec handoff cutover:** `docs/M4-cutover-handoff.md` (arsitektur 2-container→1, prasyarat C, tugas G Dockerfile/compose/CI, sekuens cutover C, gotcha Prisma-musl/standalone).
> **Prasyarat C SELESAI** (commit `80ad392`, aman/reversibel): `next.config` `output:'standalone'` + Prisma `binaryTargets` musl; tervalidasi (engine musl+native, build hijau, `.next/standalone/server.js` ada). Ditunda ke sekuens flip: rotate secret + `BETTER_AUTH_URL` origin nyata. Berikutnya: tugas G (Dockerfile/compose/CI) — konfirmasi Master + window Gemini.

> **Pembagian model M4 (risk-based, D8):** keputusan arsitektur/sekuens, semua yang menyentuh **uang/keamanan/secret nyata**, dan **seluruh review+gate** → **C (Opus)**. IaC/config mekanis ter-spesifikasi → **G (Mipro)** (konfirmasi user + window Gemini). Edit kode berulang lintas-file & verifikasi visual → **S (Sonet)** (subagent otomatis). Tiap item G/S → diff balik ke C untuk review+gate sebelum commit.

**Cutover:**
- [ ] Set `BETTER_AUTH_URL` + CORS ke origin nyata (port 3020) — **C** (security-sensitive: origin/CSRF)
- [ ] Dockerfile + compose untuk app Next.js — **G** implement → **C** review (mekanis, ter-spesifikasi)
- [ ] Alihkan port 3020 (reverse-proxy) dari frontend lama → Next.js — **C** putuskan sekuens cutover; **G** tulis konfig nginx → **C** review (risiko downtime)
- [ ] Update CI (`.github/workflows`) ke stack baru — **G** implement → **C** review
- [ ] Rotate secret placeholder (`DB_PASSWORD`, `BETTER_AUTH_SECRET`) — **C only** (tak ada deputi menyentuh secret nyata)
- [ ] Verifikasi paritas penuh di staging → matikan `api/` & `frontend/` lama — **C** (judgment) + **S** (paritas Playwright)
- [ ] Hapus stack lama (Express/Knex/Vite) setelah stabil — **C** putuskan; **G/S** eksekusi hapus → **C** review

**Security & quality hardening (terkumpul selama M3 — WAJIB sebelum produksi):**
- [x] **Price-tampering (CRITICAL):** `POST /api/sales/transactions` percaya `price` dari klien (`subtotal=Σ client_price×qty`) → kasir/klien bisa kirim `price=1`. **SELESAI** (commit `d077568`, **C/Opus**): `price` dibuang dari skema input; lookup harga otoritatif DB by id; validasi item ada+`is_active`; clamp diskon per-baris ≤ subtotal baris. Runtime 7/7 (client price=1 diabaikan→subtotal DB, item tak ada→400, diskon>baris→400; data test dibersihkan); typecheck 0, build hijau.
- [x] **P2002 dup-code (HIGH):** `POST/PUT /api/library/items` dup `code` balik **500** (cek nama constraint salah; P2002 Postgres balik nama FIELD). **SELESAI** (commit `f6f0890`, **C/Opus** — dikerjakan C karena biaya kecil, bukan G): DRY via `handleApiError` terpusat → P2002 **409** pesan field-aware ("Nilai duplikat untuk: code") + P2003 → 409 (berlaku semua route); ganti catch lokal items GET/POST/PUT/DELETE → handleApiError; buang 4× `catch any` + 2× `as any` (`satisfies Prisma.items*Input`). Catatan: **409** (Conflict, lebih tepat semantik) bukan 400 usulan awal. Runtime 7/7 (POST/PUT dup→409+pesan 'code'; data test dibersihkan); typecheck 0, build hijau.
- [x] **A11y label association (MEDIUM):** label form belum `htmlFor`/`id`-associated di **seluruh** form. **SELESAI** (commit `8d88dfa`, **S/Deputi Sonet** via subagent, review+gate **C/Opus** lulus): `htmlFor`/`id` via `useId()` (settings 6, inventory Adjustment 4/PO 2, library FieldInput semua case, sales VoidModal 1) + `aria-label` utk kontrol tanpa label terlihat (search/date/select filter, qty/cost/refund per-baris). Checkbox/label-wrap dibiarkan (asosiasi implisit benar). Rules of Hooks dijaga (useId top-level; per-baris pakai base+derivasi). Asosiasi-saja: nol perubahan perilaku; typecheck 0, build hijau (gate C independen).
- [ ] Verifikasi visual penuh lintas-breakpoint (browser/Playwright) untuk semua halaman M3 — **S** (Playwright/e2e) → **C** review

