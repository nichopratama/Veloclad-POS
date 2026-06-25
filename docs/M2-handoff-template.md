# M2 — Handoff Spec: Port API Express → Next.js (untuk Gemini 3.1 Pro)

> **Cara pakai:** Claude (window ini) mengisi spec per modul di bawah, lalu capt menyerahkan
> dokumen ini ke Gemini di window lain. Gemini mengimplementasi **satu modul per sesi**.
> Setelah selesai, capt bawa diff-nya kembali ke Claude untuk **review + gate**.
>
> **Prasyarat:** M1 (Better Auth) selesai. Semua route baru memakai session Better Auth, bukan JWT.

---

## A. ATURAN GLOBAL (berlaku untuk SEMUA modul — wajib dipatuhi Gemini)

1. **Lokasi:** Next.js App Router Route Handlers di `web/src/app/api/<modul>/...route.ts`.
2. **Auth:** ambil session via Better Auth server util (`auth.api.getSession`). Tanpa session → `401`.
3. **RBAC:** endpoint sensitif (POST/PUT/DELETE master-data, void, settings, PO, adjustment) wajib `requireRole('owner','admin')`. GET read-only boleh semua role login.
4. **Validasi input:** SEMUA body/query divalidasi dengan **Zod** (`zod`), parse di awal handler. Gagal → `400` dengan pesan ringkas (jangan bocorkan internal).
5. **DB:** pakai **Prisma** (`@/lib/prisma`). DILARANG query mentah string-concat. Pakai `include`/`select` — **tanpa N+1**.
6. **Pagination:** semua list endpoint WAJIB `take`/`skip` + balikan meta `{ total, page, limit, totalPages }`.
7. **Multi-tenant:** schema sudah di-pin via `DATABASE_URL ?schema=` — JANGAN set `search_path` manual.
8. **Error handling:** bungkus dengan try/catch → log detail server-side, balikan **pesan generik** untuk 5xx (`{ error: 'Internal server error' }`). 4xx boleh pesan spesifik.
9. **Format response:** konsisten. List → `{ data, pagination }`. Mutasi → `{ message, id? }`. Error → `{ error }`.
10. **Transaksi DB:** operasi multi-tabel (buat transaksi penjualan, void, PO receive) WAJIB `prisma.$transaction`.
11. **Uang/stok (kritikal):** saat checkout, **guard `stock >= qty`** (anti-oversell) + idempotency (Idempotency-Key) untuk `POST /transactions`.
12. **TypeScript strict** — tanpa `any`. Tipe dari Prisma + `z.infer`.
13. **JANGAN sentuh** folder `api/` & `frontend/` lama, dan tabel existing (hanya baca/tulis data, bukan ubah skema).

### Definition of Done per modul
- [ ] Semua endpoint modul porting (paritas dengan Express lama — lihat tabel modul).
- [ ] Zod schema untuk tiap input.
- [ ] RBAC terpasang sesuai tabel.
- [ ] `npm run typecheck` & `npm run build` hijau.
- [ ] Tes manual cURL tiap endpoint (sertakan perintah + output di catatan handoff).
- [ ] Tidak ada `any`, tidak ada kebocoran `error.message` pada 5xx.

---

## B. REFERENSI: endpoint Express lama (sumber paritas)

| Modul | File lama | Endpoint |
|-------|-----------|----------|
| auth | `api/src/routes/auth.js` | (diganti Better Auth di M1) |
| library | `api/src/routes/library.js` | items/categories/customers/suppliers CRUD, payment-types CRUD, discounts CRUD |
| sales | `api/src/routes/sales.js` | pos-items, transactions (list+create), void-items, void |
| inventory | `api/src/routes/inventory.js` | stock-summary, purchase-orders (list+create+receive), adjustments |
| dashboard | `api/src/routes/dashboard.js` | summary, sales-chart, top-items |
| settings | `api/src/routes/settings.js` | store (get+put) |

Urutan handoff yang disarankan: **library → inventory → sales → dashboard → settings**
(library paling mekanis = pemanasan; sales paling kritikal = setelah pola mapan).

---

## C. TEMPLATE SPEC PER MODUL (Claude isi sebelum handoff)

> Salin blok ini per modul. Contoh terisi: **library** (di bawah).

### Modul: `<nama>`
- **Path dasar:** `web/src/app/api/<nama>/`
- **Model Prisma terkait:** `<daftar model>`
- **Endpoints:**

| Method | Path | RBAC | Input (Zod) | Logika ringkas | Response |
|--------|------|------|-------------|----------------|----------|
| GET | `/...` | login | query: ... | ... | `{ data, pagination }` |
| POST | `/...` | owner/admin | body: ... | ... | `{ message, id }` |

- **Catatan khusus:** (transaksi DB? idempotency? perhitungan?)
- **cURL test yang diharapkan:** (daftar)

---

## D. CONTOH TERISI — Modul `library` (pola acuan untuk Gemini)

- **Path dasar:** `web/src/app/api/library/`
- **Model Prisma:** `items`, `categories`, `customers`, `suppliers`, `payment_types`, `discounts`
- **Endpoints:**

| Method | Path | RBAC | Input (Zod) | Logika | Response |
|--------|------|------|-------------|--------|----------|
| GET | `/items` | login | query `{ page?, limit?, search? }` | filter `name/code ilike`, join category+supplier | `{ data, pagination }` |
| POST | `/items` | owner/admin | body item (code, name, price, ...) | create | `{ message, id }` |
| PUT | `/items/[id]` | owner/admin | body partial | update by id | `{ message }` |
| DELETE | `/items/[id]` | owner/admin | — | delete by id | `{ message }` |
| GET | `/categories` | login | query `{ search? }` | list | `{ data }` |
| POST/PUT/DELETE | `/categories[/id]` | owner/admin | body `{ name, description }` | CRUD | `{ message, id? }` |
| GET | `/customers` | login | query `{ search? }` | list (search name/phone/email) | `{ data }` |
| POST/PUT/DELETE | `/customers[/id]` | owner/admin (delete), login (create/update) | body customer | CRUD | `{ message, id? }` |
| GET | `/suppliers` | login | query `{ search? }` | list | `{ data }` |
| POST/PUT/DELETE | `/suppliers[/id]` | owner/admin | body supplier | CRUD | `{ message, id? }` |
| GET | `/payment-types` | login | — | list | `{ data }` |
| POST/PUT/DELETE | `/payment-types[/id]` | owner/admin | body `{ name, type, is_active }` | CRUD | `{ message, id? }` |
| GET | `/discounts` | login | query `{ search? }` | list | `{ data }` |
| POST/PUT/DELETE | `/discounts[/id]` | owner/admin | body `{ name, type, value, max_value?, is_active }` | CRUD | `{ message, id? }` |

- **Catatan khusus:** murni CRUD, tak ada transaksi DB. Pagination hanya wajib di `/items` (tabel besar: 1100+ baris). List master kecil boleh tanpa paginasi tapi tetap `{ data }`.
- **Contoh Zod (item):**
```ts
const itemSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  category_id: z.number().int().optional(),
  unit: z.string().default('pcs'),
  hpp: z.number().nonnegative().default(0),
  price: z.number().nonnegative(),
  min_stock: z.number().int().default(0),
  supplier_id: z.number().int().optional(),
  stock: z.number().int().default(0),
  is_active: z.boolean().default(true),
});
```
- **cURL test diharapkan:**
  - `GET /api/library/items?search=...` → 200 `{ data, pagination }`
  - `POST /api/library/items` tanpa session → 401
  - `DELETE /api/library/items/1` sebagai kasir → 403
  - `DELETE /api/library/items/1` sebagai owner → 200

---

## E. PROTOKOL REVIEW (saat diff balik ke Claude)
Claude akan cek: paritas endpoint, kebenaran Zod, RBAC, no N+1, pagination, no leak 5xx, `$transaction` pada operasi kritikal, build hijau. Temuan CRITICAL/HIGH wajib diperbaiki sebelum modul dianggap selesai (Nicho-Brain D6/D7).

