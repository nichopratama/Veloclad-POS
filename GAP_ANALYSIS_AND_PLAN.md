# AntiGravity POS — Gap Analysis & Implementation Plan

> **Dibuat:** 2026-06-25 · **Acuan:** `PRD_POS_System.md` + Nicho-Brain Manifesto v2.2
> **Profil Nicho-Brain:** **FULL** (wajib — sistem menangani uang + multi-tenant auth)

---

## 1. Ringkasan Eksekutif

Tulang punggung POS (kasir, transaksi, inventory, produk, laporan) **sudah jalan dan bisa dipakai operasional**. Estimasi **±60–65% FR PRD terpenuhi**.

Gap terbagi dua kelas:

- **Gap Fitur (PRD)** — fungsionalitas yang dijanjikan PRD tapi belum ada. Terkonsentrasi di cluster **Promo / Diskon / Bundling** dan beberapa setting.
- **Gap Rigor (Nicho-Brain)** — pilar produksi (validasi, keamanan, test, CI, observability) yang wajib untuk profil FULL.

**Temuan penting:** tabel `promos` & `discounts` **sudah ada** di `migrations/...001_initial_schema.js` — jadi cluster diskon/promo sebagian besar tinggal bangun API + UI, bukan skema dari nol.

---

## 2. Gap Analysis — Fitur (vs PRD)

Legenda status: ✅ Lengkap · 🟡 Parsial · 🔴 Hilang

### 2.1 Matriks Functional Requirement

| FR | Fitur | Status | Tabel DB | API | UI | Catatan |
|----|-------|:---:|:---:|:---:|:---:|---------|
| FR-DASH-01 | Summary cards | ✅ | ✅ | ✅ | ✅ | |
| FR-DASH-02 | Grafik penjualan | ✅ | ✅ | ✅ | ✅ | |
| FR-DASH-03 | Top produk | ✅ | ✅ | ✅ | ✅ | |
| FR-DASH-04 | Notifikasi stok | 🔴 | ✅ | 🔴 | 🔴 | **KOREKSI:** `/summary` hanya totalSales/count/items — TIDAK ada low-stock |
| FR-DASH-05 | Ringkasan transaksi terakhir | 🔴 | ✅ | 🔴 | 🔴 | **KOREKSI:** tidak ada di `/summary` |
| FR-SALE-01 | Transaksi baru / kasir | 🟡 | ✅ | 🟡 | ✅ | Diskon per item belum (kolom `transaction_items.discount` tak ada); barcode = search biasa |
| **FR-SALE-02** | **Penerapan promo & diskon** | 🔴 | ✅ | 🔴 | 🔴 | `discount_amount: 0` hardcoded di checkout |
| FR-SALE-03 | Riwayat transaksi + filter | 🟡 | ✅ | 🟡 | ✅ | **KOREKSI:** filter kasir & metode bayar belum ada (hanya status/tanggal/no-invoice) |
| FR-SALE-04 | Detail + cetak ulang struk | 🟡 | ✅ | ✅ | 🟡 | Reprint via jsPDF client — verifikasi |
| FR-SALE-05 | Pembatalan & refund | ✅ | ✅ | ✅ | ✅ | |
| FR-INV-01 | Stock summary | ✅ | ✅ | ✅ | ✅ | |
| FR-INV-02 | Supplier mgmt (mirror) | ✅ | ✅ | ✅ | ✅ | Histori PO per supplier belum |
| FR-INV-03 | Purchase Order + partial receive | 🟡 | 🟡 | 🟡 | ✅ | **KOREKSI:** receive hanya penuh — `po_items` tak punya `qty_received`, tak ada `expected_date`, tak ada cancel PO. Partial receive BELUM ada |
| FR-INV-04 | Stock adjustment | ✅ | ✅ | ✅ | ✅ | |
| **FR-INV-05** | **Histori pergerakan stok** | 🔴 | 🔴 | 🔴 | 🔴 | Butuh tabel `stock_movements` + ledger |
| FR-LIB-01 | Customer CRUD + loyalty + histori | 🟡 | ✅ | ✅ | ✅ | Poin & histori transaksi per customer belum |
| FR-LIB-02 | Supplier CRUD | ✅ | ✅ | ✅ | ✅ | |
| FR-LIB-03 | Item CRUD + foto + CSV | 🟡 | ✅ | ✅ | ✅ | Upload foto produk belum (lihat catatan) |
| FR-LIB-04 | Kategori CRUD | ✅ | ✅ | ✅ | ✅ | |
| **FR-LIB-05** | **Bundling produk** | 🔴 | 🔴 | 🔴 | 🔴 | Butuh tabel `bundles` + `bundle_items` |
| **FR-LIB-06** | **Promo** | 🔴 | ✅ | 🔴 | 🔴 | Tabel ada; perlu `applicable_to`/scope cols |
| **FR-LIB-07** | **Diskon master** | 🔴 | ✅ | 🔴 | 🔴 | Tabel ada; tinggal API + UI |
| **FR-LIB-08** | **Tipe pembayaran CRUD** | 🟡 | ✅ | 🟡 | 🟡 | Hanya `GET`; perlu POST/PUT/DELETE |
| **FR-SET-01** | **Profil akun + ganti password** | 🔴 | ✅ | 🔴 | 🔴 | Tabel `users` ada; tak ada endpoint |
| FR-SET-02 | Pengaturan toko | ✅ | ✅ | ✅ | ✅ | Logo upload belum |
| FR-SET-03 | Pengaturan pajak | 🟡 | ✅ | 🟡 | 🟡 | `is_inclusive` ada di tabel tapi tak dipakai di checkout |
| FR-SET-04 | Pengaturan receipt | 🟡 | ✅ | 🟡 | 🟡 | `header`/`show_tax`/`show_discount` ada; UI hanya footer |

### 2.2 Ringkasan Gap Fitur

**Cluster A — Promosi (prioritas bisnis tertinggi):**
- FR-LIB-07 Diskon master → API + UI (tabel siap)
- FR-LIB-06 Promo → kolom scope + API + UI
- FR-LIB-05 Bundling → tabel baru + API + UI
- FR-SALE-02 Terapkan diskon/promo di checkout → integrasi engine ke `POST /transactions`

**Cluster B — Setting & Akun:**
- FR-SET-01 Profil akun + ganti password
- FR-LIB-08 Payment-types CRUD penuh
- FR-SET-03 Mode pajak inklusif/eksklusif
- FR-SET-04 Receipt header + toggle kolom + preview

**Cluster C — Inventory & Customer:**
- FR-INV-05 Stock movement ledger (mutasi otomatis dari sale/PO/adjustment/void)
- FR-LIB-01 Loyalty point + histori transaksi per customer
- FR-LIB-03 Upload foto produk (butuh asset handling)

---

## 3. Gap Analysis — Rigor (vs Nicho-Brain, profil FULL)

| Directive | Status | Gap |
|-----------|:---:|-----|
| **D7 RBAC / authorization** | 🔴 | **TERLEWAT di v1:** `role` ada di JWT (owner/admin/kasir) tapi **tak ada cek otorisasi** di endpoint manapun. Kasir bisa void, delete, ubah setting. PRD NFR mewajibkan RBAC |
| **D7 Penyimpanan token** | 🔴 | **TERLEWAT di v1:** JWT + data user disimpan di `localStorage` (rawan XSS). Harus httpOnly cookie |
| **D18 Overselling stok** | 🔴 | **TERLEWAT di v1:** `decrement('stock')` saat sale tanpa cek `stock >= qty` → stok bisa minus (jual barang habis) |
| D5 Input validation (Zod) | 🔴 | `zod` ter-install tapi **0 dipakai**; semua `req.body` mentah |
| D5 Audit logging | 🔴 | Tak ada `audit_logs` untuk aksi admin |
| D7 Security headers | 🔴 | Tanpa helmet/CSP/HSTS; `cors()` terbuka penuh |
| D7 Error leak | 🟠 | `res.json({ error: error.message })` bocorkan internal |
| **D7 Tenant isolation race** | 🔴 | `SET search_path` di pool tak ter-pin → **risiko bocor lintas-tenant** |
| D9 Git | 🔴 | Repo **belum di-`git init`** |
| D9 CI gate | 🔴 | Workflow hanya SSH-deploy; tanpa lint/tsc/test/audit/secret-scan/build |
| D10 Env fail-fast | 🔴 | Tak ada Zod env schema; `JWT_SECRET` tak divalidasi saat boot |
| D12 Testing | 🔴 | **0 test, 0% coverage**; `npm test` = `exit 1` |
| D13 Observability | 🔴 | `console.log`; tak ada structured log / global error handler / `/health/ready` |
| D14 Rate limit | 🔴 | `/login` tanpa limit & lockout |
| D17 Pagination | 🔴 | `GET /transactions` & list lain unbounded |
| D18 Idempotency | 🔴 | `POST /transactions` rawan double-submit |
| D18 Timeout I/O | 🔴 | Tak ada timeout DB |
| D11 Migrations | 🟢 | Knex migrate dipakai (OK) |

---

## 3b. Addendum — Temuan Pass Verifikasi #2 (2026-06-25)

Verifikasi mendalam ke kode menemukan item yang **terlewat / salah status** di versi awal. Ringkasannya:

**Gap baru (masuk ke fase):**
1. **RBAC (D7)** — tak ada otorisasi per-role. → masuk **FASE 0** (middleware `requireRole`) + diterapkan tiap fase di endpoint sensitif (void, delete, settings, profil user).
2. **Token di localStorage (D7)** — pindah ke httpOnly cookie + CSRF. → **FASE 0/1**.
3. **Overselling stok (D18)** — guard `stock >= qty` + (idealnya) lock baris saat checkout. → **FASE 1** (bareng idempotency).
4. **Dashboard FR-DASH-04/05** — low-stock alert + recent transactions belum ada. → **FASE 4** (atau quick patch di dashboard).
5. **Filter riwayat (FR-SALE-03)** — tambah filter kasir & metode bayar. → **FASE 1** (saat sentuh sales query/pagination).
6. **PO partial receive (FR-INV-03)** — butuh kolom `po_items.qty_received`, `purchase_orders.expected_date`, status `partial`, endpoint cancel. → **FASE 4** (bareng ledger).

**Prasyarat migration yang harus diingat:**
- **FASE 2** butuh migration tambah kolom `transaction_items.discount` (per-item discount belum ada kolomnya) sebelum engine diskon bisa simpan nilai per item.
- Foto produk: kolom `items.image_url` **sudah ada** (dari migration 002 CSV) — jadi FR-LIB-03 hanya butuh pipeline upload, bukan kolom baru.

**Catatan tech-debt (bukan FR, tapi perlu dirapikan):**
- `transactions` punya banyak kolom denormalisasi hasil import CSV (`cashier_name`, `customer_name`, `payment_method_name`, `outlet`, `event_type`, dst). Ini artefak data lama — saat refactor, andalkan join (sudah ada) dan pertimbangkan deprecate kolom denormal agar tak jadi sumber kebenaran ganda.
- i18n (i18next) sudah terpasang di frontend — bukan gap, tapi konsistensi terjemahan perlu dicek saat menambah halaman baru.
- Dark mode (NFR "dark mode ready") belum diimplementasi — prioritas rendah.

## 4. Implementation Plan

Prinsip: **fix fondasi dulu (yang membahayakan uang/data), baru fitur, dengan rigor menyertai tiap fitur.** Tiap fase = unit yang bisa di-commit & di-review.

### FASE 0 — Fondasi Keamanan & Repo *(blocker, ±1–2 hari)*
Tujuan: hentikan risiko data/uang & penuhi prasyarat Nicho-Brain sebelum nambah fitur.

1. **Fix tenant-isolation race (D7/D18)** — ganti `SET search_path` global jadi koneksi ter-scope per request: gunakan `knex.transaction` + `SET LOCAL search_path`, atau buat helper `withTenant(cb)`. Ini bug terparah.
2. `git init` + commit baseline + conventional commits (D9).
3. **Zod env schema fail-fast** di boot (D10) — crash kalau `JWT_SECRET`/DB config hilang.
4. **Security middleware** (D7) — `helmet`, CORS whitelist + `credentials`, hilangkan kebocoran `error.message` (map ke pesan generik + log internal).
5. **Global error handler + structured logging** (`pino`) + `/health/ready` DB-aware (D13).
6. **Rate-limit `/login`** + lockout dasar (D14).
7. **RBAC middleware `requireRole(...)`** (D7) — terapkan ke endpoint sensitif (void, delete, settings). *(Pass #2)*
8. **Pindahkan token ke httpOnly cookie** + CSRF (ganti localStorage) (D7). *(Pass #2)*

**Exit criteria:** boot gagal tanpa env; header keamanan tampil; login ter-rate-limit; tak ada query lintas-tenant; kasir tak bisa akses aksi admin.

### FASE 1 — Harness Validasi & Test *(±1–2 hari)*
1. Pasang **Zod schema** untuk semua route write (D5) — mulai dari `sales`, `library`, `inventory`.
2. **Idempotency** `POST /transactions` (D18) — header `Idempotency-Key` + unique constraint.
2b. **Guard overselling** (D18) — cek `stock >= qty` + lock baris item saat checkout. *(Pass #2)*
3. **Pagination** semua list endpoint (D17) — `take`/`skip` + meta `{ total, page, limit }`; sekaligus tambah **filter kasir & metode bayar** di riwayat transaksi (FR-SALE-03). *(Pass #2)*
4. **Test runner** (Vitest/Jest + Supertest) — uji business logic transaksi (pajak, kembalian, void, refund) sebagai prioritas (D12).
5. **CI gate** GitHub Actions (D9): lint + test + `npm audit` + gitleaks + docker build, sebelum job deploy.

**Exit criteria:** CI hijau; test transaksi inti lulus; semua list ter-paginasi & tervalidasi.

### FASE 2 — Cluster Promosi (nilai bisnis tertinggi) *(±2–3 hari)*
0. **Migration prasyarat** — tambah kolom `transaction_items.discount` (per-item discount belum ada kolomnya). *(Pass #2)*
1. **Diskon master (FR-LIB-07)** — `GET/POST/PUT/DELETE /library/discounts` + halaman `Library/Discounts.jsx`. *(API CRUD sudah dibuat di Quick Wins)*
2. **Promo (FR-LIB-06)** — migration tambah kolom scope (`applicable_to`, `item_ids`, `category_ids`, `is_active`) ke `promos`; API + halaman `Library/Promos.jsx`.
3. **Discount/Promo engine** — modul `services/pricing.js` murni (unit-tested) yang hitung subtotal → diskon → promo → pajak (hormati `is_inclusive`) → total.
4. **Integrasi checkout (FR-SALE-02)** — `POST /transactions` pakai engine; isi `discount_amount` & `transaction_items.discount` betulan; UI kasir: input diskon per item / per transaksi + pilih promo.

**Exit criteria:** kasir bisa terapkan diskon manual & promo otomatis; angka tersimpan benar; engine ber-test ≥80%.

### FASE 3 — Setting & Akun *(±2 hari)*
1. **Profil akun + ganti password (FR-SET-01)** — `GET/PUT /auth/profile`, `PUT /auth/password` (verifikasi password lama, re-hash bcrypt) + halaman profil.
2. **Payment-types CRUD (FR-LIB-08)** — lengkapi POST/PUT/DELETE + UI.
3. **Pajak inklusif/eksklusif (FR-SET-03)** — pakai `is_inclusive` di engine + UI toggle.
4. **Receipt lengkap (FR-SET-04)** — header + `show_tax`/`show_discount` toggle + preview struk live; sinkron ke generator jsPDF.

**Exit criteria:** user bisa ganti password; payment type dikelola dari UI; struk & pajak konfigurabel.

### FASE 4 — Inventory Ledger & Customer *(±2 hari)*
1. **Stock movement ledger (FR-INV-05)** — migration `stock_movements`; tulis mutasi otomatis dari **sale, void, PO receive, adjustment** (satu sumber kebenaran stok); endpoint histori + filter; UI.
2. **Loyalty + histori customer (FR-LIB-01)** — akumulasi `points` saat transaksi; `GET /library/customers/:id/transactions` + tampilan histori.
3. **PO partial receive (FR-INV-03)** — migration `po_items.qty_received` + `purchase_orders.expected_date` + status `partial`; logika terima sebagian + endpoint cancel PO. *(Pass #2)*
4. **Dashboard FR-DASH-04/05** — tambah low-stock alert + recent transactions ke `/summary` (atau endpoint baru) + widget UI. *(Pass #2)*
5. **(Opsional) Foto produk & logo toko (FR-LIB-03/SET-02)** — pipeline upload ke kolom `items.image_url` yang sudah ada (Multer/Nicho-Brain D5) + sanitasi upload (D7).

**Exit criteria:** setiap perubahan stok punya jejak; poin pelanggan bertambah; histori per pelanggan tampil; PO bisa diterima sebagian; dashboard tampilkan stok menipis & transaksi terbaru.

### FASE 5 — Bundling & Pengetatan Akhir *(±2 hari)*
1. **Bundling (FR-LIB-05)** — migration `bundles` + `bundle_items`; API + UI; tampil sebagai item di kasir; engine expand bundle saat checkout & potong stok komponen.
2. **Audit logging (D5)** — `audit_logs` untuk aksi admin (CRUD, void, setting).
3. **Pengetatan Nicho-Brain sisa** — timeout I/O (D18), index DB pada kolom filter/join (D17), `prefers-reduced-motion` & a11y pass (D15), responsive verify 360–1440 (D20).
4. **Pre-delivery gate (D-Gate#5)** — `npm run build` FE & BE hijau; coverage ≥80% pada business logic; security-review pass.

**Exit criteria:** semua FR PRD ✅; profil FULL Nicho-Brain terpenuhi; build & test hijau di CI.

### FASE 6 — SaaS-ification *(jika dijual sebagai SaaS — ±4–6 hari)*
Prasyarat sebelum menagih customer. Model tenant: **Silo** (lihat `docs/ADR-001-multi-tenancy.md`).

1. **Tenant control plane** — DB/registry pusat (daftar tenant, status, subdomain, plan); jadikan sumber kebenaran (bukan env per-stack).
2. **Otomasi provisioning** — `setup-tenant.js` → alur ter-otomasi: create schema → migrate → seed admin → daftar ke registry → siapkan stack/subdomain.
3. **Super-admin lintas-tenant** — dashboard operator: lihat/suspend/aktifkan tenant, lihat health & pemakaian. Terpisah dari RBAC dalam-tenant (FASE 0).
4. **Onboarding & signup** — alur daftar mandiri tenant baru + verifikasi email + buat admin pertama.
5. **Billing & langganan** — integrasi pembayaran (mis. Midtrans/Stripe), paket/plan, status aktif/grace/suspend, batas kuota per plan.
6. **Routing per tenant** — reverse-proxy (Nginx/Traefik) `tenant.app.com` → stack tenant.
7. **Deploy fan-out** — pipeline roll upgrade ke semua stack tenant + health-gate per tenant + rollback per tenant (D16).
8. **Backup per tenant + restore drill terjadwal** (D11) — wajib karena data customer.
9. **Data lifecycle & privacy (D19)** — retensi PII, enkripsi at-rest, hak penghapusan data tenant saat berhenti langganan.
10. **Observability per tenant** (D13) — log & metrik ber-label tenant; alerting saat satu tenant down.

**Exit criteria:** tenant baru bisa di-provision otomatis; super-admin & billing jalan; tiap tenant punya backup teruji; upgrade bisa di-roll ke semua tenant dengan aman.

> Pemicu revisit ke model **Pooled** (Opsi B di ADR): tenant > ~20 atau biaya per-tenant tak ekonomis.

---

## 5. Urutan Eksekusi & Dependensi

```
FASE 0 (fondasi)  ─┬─▶ FASE 1 (validasi+test+CI)
                   │
                   └─▶ FASE 2 (promosi) ──▶ FASE 5 (bundling pakai engine) ──▶ FASE 6 (SaaS-ification)
                       FASE 3 (setting)
                       FASE 4 (ledger+customer)
```

- FASE 0 & 1 **wajib lebih dulu** (blocker keamanan + harness).
- FASE 2 sebelum FASE 5 (bundling memakai pricing engine).
- FASE 3 & 4 independen — bisa paralel setelah FASE 1.
- FASE 6 hanya jika dijual sebagai SaaS; idealnya setelah FASE 0–1 stabil (fix race + RBAC = prasyarat). Lihat `docs/ADR-001-multi-tenancy.md`.

## 6. Estimasi Total

| Fase | Fokus | Estimasi |
|------|-------|----------|
| 0 | Fondasi keamanan & repo | 1–2 hari |
| 1 | Validasi, test, CI | 1–2 hari |
| 2 | Promosi (diskon/promo/engine) | 2–3 hari |
| 3 | Setting & akun | 2 hari |
| 4 | Inventory ledger & customer | 2 hari |
| 5 | Bundling & pengetatan akhir | 2 hari |
| | **Subtotal (produk siap produksi)** | **±10–13 hari kerja** |
| 6 | SaaS-ification (silo + control plane + billing) | 4–6 hari |
| | **Total dengan SaaS** | **±14–19 hari kerja** |

## 7. Quick Wins (bisa duluan, dampak besar / effort kecil)
1. `git init` + CI gate dasar — 1–2 jam.
2. Zod env fail-fast + helmet + CORS whitelist — setengah hari.
3. Diskon master CRUD (tabel sudah ada) — setengah hari.
4. Payment-types CRUD (lengkapi yang parsial) — 1–2 jam.
