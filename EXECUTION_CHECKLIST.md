# AntiGravity POS — Execution Checklist & Pembagian Model

> Pendamping `GAP_ANALYSIS_AND_PLAN.md`. Pembagian model mengikuti **Nicho-Brain D8 (Brain Hierarchy)**.
> Centang `[x]` saat selesai. Profil: **FULL**.

## Pembagian Model (Tier → Fase)

| Tier | Model (primary / fallback) | Tanggung jawab |
|------|----------------------------|----------------|
| **Reasoning** | Opus 4.8 / Gemini 3.1 Pro | Plan & PRD-patch, **Security Review**, arsitektur engine pricing/tenant |
| **Design** | Sonnet 4.6 (Thinking) / Opus 4.8 | UI/UX halaman baru (Diskon, Promo, Bundling, Profil), preview struk, responsif |
| **Implementation** | Gemini 3.1 Pro / Opus 4.8 | Tulis route, migration, service, integrasi checkout, test |
| **Code Review** | Impl-tier+ (Opus 4.8) | `tsc`/eslint, `npm audit`, logika vs PRD |
| **Fast** | Gemini Flash / Haiku 4.5 | Seed/dummy data, format CSV, log boilerplate, copy i18n |

> **Model-Availability Clause:** jika tier yang ditunjuk tak tersedia, model aktif mengambil alih persona fase itu sendiri. Rigor tetap mengikat.

---

## ✅ Quick Wins — SELESAI (commit `63c255a`)

- [x] `git init` + commit baseline (node_modules tidak ter-track, `.env` ignored) — *Impl*
- [x] Env fail-fast Zod (`api/src/config/env.js`) + wiring boot — *Impl*
- [x] Helmet + CORS whitelist + `credentials` (`index.js`) — *Impl*
- [x] CI gate (`ci.yml`: frontend lint/build, api audit/test, gitleaks) — *Impl*
- [x] Deploy gated `workflow_run` CI sukses (`deploy.yml`) — *Impl*
- [x] Diskon master CRUD + Payment-types CRUD penuh (`library.js`) — *Impl*
- [x] `.env.example` sinkron (`CORS_ORIGIN`) — *Impl*

---

## 🔄 FASE 0 — Fondasi Keamanan *(blocker)* — sebagian besar SELESAI (commit `0b18ee2`)

- [x] **Fix tenant-isolation race** — `search_path` di-set di level pool (`knexfile afterCreate`), sekali per koneksi → race hilang untuk model silo. Lebih baik dari `SET LOCAL` per-request untuk arsitektur saat ini — *Impl*
- [x] Strip middleware `setTenantSchema` racy dari semua route (`auth/sales/library/inventory/settings/dashboard`) — *Impl*
- [x] Rate-limit `/api/auth` (10/15mnt/IP) (`express-rate-limit`) — *Impl* · *(lockout per-akun → FASE 1)*
- [x] Structured logging (`pino` + `pino-http`) + global error handler (pesan generik, detail di log) + 404 handler — *Impl*
- [x] `/health/ready` DB-aware — *Impl* · **terverifikasi 503 saat DB down**
- [x] **RBAC** `requireRole('owner','admin')` di endpoint sensitif (void, deletes, settings, PO, adjustments, payment-types/discounts writes) — *Impl*
- [x] *(bonus)* Graceful shutdown SIGTERM/SIGINT + `unhandledRejection`/`uncaughtException` handler (D18/D13) — *Impl*
- [ ] Pindah token ke httpOnly cookie + CSRF (ganti localStorage) — *Impl* · **DITUNDA**: ubah alur login FE+BE, wajib verifikasi dengan app berjalan
- [ ] **Security review** FASE 0 (OWASP, header, no-leak, RBAC) — *Reasoning* · setelah cookie auth
- [ ] *(debt)* Konsolidasi 7 pool Knex → 1 instance bersama — *Impl* · FASE 1

## ⬜ FASE 1 — Validasi, Test, CI

- [ ] Zod schema semua route write (mulai `sales`, `library`, `inventory`) — *Impl*
- [ ] Idempotency `POST /transactions` (Idempotency-Key + unique constraint) — *Reasoning (desain) → Impl*
- [ ] Guard overselling: cek `stock >= qty` + lock baris saat checkout — *Impl* · *(Pass #2)*
- [ ] Pagination semua list endpoint + meta; tambah filter kasir & metode bayar di riwayat — *Impl* · *(Pass #2)*
- [ ] Test runner (Vitest + Supertest) + uji logika transaksi (pajak/kembalian/void/refund) — *Impl*
- [ ] Aktifkan `npm test` riil di CI; coverage gate bertahap — *Impl*
- [ ] **Code review** FASE 1 (`tsc`/eslint/`npm audit`) — *Code Review*

## ⬜ FASE 2 — Cluster Promosi *(nilai bisnis tertinggi)*

- [ ] Migration prasyarat: kolom `transaction_items.discount` (per-item) — *Impl* · *(Pass #2)*
- [ ] Migration: kolom scope `promos` (`applicable_to`, `item_ids`, `category_ids`, `is_active`) — *Impl*
- [ ] API Promo CRUD (`/library/promos`) — *Impl*
- [ ] **Pricing engine** `services/pricing.js` (subtotal→diskon→promo→pajak inklusif/eksklusif→total), unit-tested ≥80% — *Reasoning (desain) → Impl*
- [ ] Integrasi checkout `POST /transactions` pakai engine (isi `discount_amount` betulan) — *Impl*
- [ ] UI halaman **Diskon** (`Library/Discounts.jsx`) — *Design*
- [ ] UI halaman **Promo** (`Library/Promos.jsx`) — *Design*
- [ ] UI kasir: input diskon per item/transaksi + pilih promo — *Design*
- [ ] **Security + code review** FASE 2 (engine = uang) — *Reasoning + Code Review*

## ⬜ FASE 3 — Setting & Akun

- [ ] API profil akun + ganti password (`/auth/profile`, `/auth/password`, verifikasi password lama) — *Impl*
- [ ] UI halaman profil — *Design*
- [ ] Pajak inklusif/eksklusif pakai `is_inclusive` di engine + UI toggle — *Impl + Design*
- [ ] Receipt lengkap: header + `show_tax`/`show_discount` + preview live + sinkron jsPDF — *Design*
- [ ] Payment-types UI (CRUD sudah ada di API) — *Design*
- [ ] **Code review** FASE 3 (fokus ganti-password) — *Code Review*

## ⬜ FASE 4 — Inventory Ledger & Customer

- [ ] Migration `stock_movements` (ledger) — *Impl*
- [ ] Tulis mutasi otomatis dari sale/void/PO-receive/adjustment (satu sumber kebenaran stok) — *Reasoning (desain) → Impl*
- [ ] Endpoint histori stok + filter + UI — *Impl + Design*
- [ ] Loyalty point akumulasi saat transaksi + histori per-customer — *Impl*
- [ ] PO partial receive: migration `po_items.qty_received` + `expected_date` + status `partial` + cancel PO — *Impl* · *(Pass #2)*
- [ ] Dashboard FR-DASH-04/05: low-stock alert + recent transactions + widget UI — *Impl + Design* · *(Pass #2)*
- [ ] (Opsional) Upload foto produk (kolom `items.image_url` sudah ada) & logo toko (Multer + sanitasi) — *Impl*
- [ ] **Code review** FASE 4 — *Code Review*

## ⬜ FASE 5 — Bundling & Pengetatan Akhir

- [ ] Migration `bundles` + `bundle_items` — *Impl*
- [ ] API + UI bundling; expand bundle saat checkout (potong stok komponen) — *Impl + Design*
- [ ] Audit logging (`audit_logs`) aksi admin — *Impl*
- [ ] Timeout I/O (D18) + index DB kolom filter/join (D17) — *Impl*
- [ ] a11y pass + `prefers-reduced-motion` + responsive verify 360–1440 — *Design*
- [ ] **Pre-delivery gate**: `npm run build` FE+BE hijau, coverage ≥80%, security-review pass — *Reasoning + Code Review*
- [ ] Tulis rationale deviasi stack (Knex/Vite) di PRD (D3) — *Fast*

## ⬜ FASE 6 — SaaS-ification *(jika dijual sebagai SaaS — model Silo, lihat `docs/ADR-001-multi-tenancy.md`)*

- [ ] Tenant control plane / registry pusat (daftar tenant, status, subdomain, plan) — *Reasoning (desain) → Impl*
- [ ] Otomasi provisioning tenant (`setup-tenant.js` → alur otomatis: schema→migrate→seed→registry) — *Impl*
- [ ] Super-admin lintas-tenant (suspend/aktifkan, health, usage) — *Impl + Design*
- [ ] Onboarding & signup tenant mandiri + verifikasi email — *Impl + Design*
- [ ] Billing & langganan (Midtrans/Stripe, plan, status aktif/grace/suspend, kuota) — *Reasoning (desain) → Impl*
- [ ] Routing per tenant (Nginx/Traefik subdomain → stack) — *Impl*
- [ ] Deploy fan-out + health-gate + rollback per tenant (D16) — *Impl*
- [ ] Backup per tenant + restore drill terjadwal (D11) — *Impl*
- [ ] Data lifecycle & privacy: retensi PII, enkripsi at-rest, hak hapus data (D19) — *Reasoning + Impl*
- [ ] Observability per tenant (log/metrik ber-label + alerting) (D13) — *Impl*
- [ ] **Security review** FASE 6 (isolasi tenant, billing, PII) — *Reasoning*

---

## Catatan koordinasi multi-model

- **Hanya satu penulis filesystem** untuk hindari konflik: model implementasi menulis, model lain (Reasoning/Design) menghasilkan spesifikasi/diff yang diterapkan oleh penulis tunggal. (Lihat skill `multi-execute`.)
- Tiap fase = satu unit commit + review sebelum lanjut (D6/D9).
- FASE 0 & 1 wajib sebelum fitur. FASE 3 & 4 boleh paralel setelah FASE 1. FASE 5 setelah FASE 2. FASE 6 hanya untuk SaaS, setelah FASE 0–1 stabil.
