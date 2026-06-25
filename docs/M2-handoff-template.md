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

### ⚡ Pelajaran dari review modul `library` (WAJIB diterapkan di modul berikutnya)
1. **Query param: parse `Object.fromEntries(url.searchParams)`** — JANGAN `searchParams.get('x')` per field. `get()` balas `null` saat absen → `null` mematahkan Zod `.default()`/`.optional()` (yang hanya jalan untuk `undefined`). Bug ini bikin SEMUA GET list balas 400 tanpa query.
2. **Hindari `as any`** pada `data:` Prisma & `catch (error: any)`. Pakai `satisfies Prisma.<Model>CreateInput` / `unknown` + narrowing. (Rule global #12: no `any`.)
3. **orderBy paritas:** untuk picklist (items, categories, payment-types) urut `name`/`id` **asc** (samakan Express lama), bukan `created_at desc`.
4. Pakai `.issues` bukan `.errors` pada `ZodError` (yang terakhir deprecated).

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

## D.2 — Modul `inventory`

- **Path dasar:** `web/src/app/api/inventory/`
- **Model Prisma:** `items`, `categories`, `suppliers`, `purchase_orders`, `po_items`, `stock_adjustments`, `users`
- **Endpoints:**

| Method | Path | RBAC | Input | Logika | Response |
|--------|------|------|-------|--------|----------|
| GET | `/stock-summary` | login | query `{ page?, limit?, search? }` | items + join category/supplier; search `name/code ilike`; **paginasi wajib** | `{ data, pagination }` |
| GET | `/purchase-orders` | login | — | PO + join supplier(name)+user(name as created_by), order by created_at desc | `{ data }` |
| POST | `/purchase-orders` | owner/admin | body `{ supplier_id:int, notes?:string, items:[{item_id:int, qty:int>0, cost:number>=0}] }` | hitung total_amount=Σ(cost*qty); generate `po_number = PO-YYYYMMDD-XXXX`; insert PO + po_items. **`$transaction`** | `{ message, po_number }` |
| PATCH | `/purchase-orders/[id]/receive` | owner/admin | — | guard PO ada & status `pending`; tambah stok tiap po_item; set status `received`. **`$transaction`** | `{ message }` |
| GET | `/adjustments` | login | — | stock_adjustments + join item(name)+user(name), order by created_at desc | `{ data }` |
| POST | `/adjustments` | owner/admin | body `{ item_id:int, qty_change:int(≠0), reason:string, notes?:string }` | insert adjustment; `qty_change>0` → increment stok, else decrement `abs`. **`$transaction`** | `{ message }` |

- **Catatan khusus:** PO `receive` saat ini **full-receive** (paritas lama) — partial receive adalah FASE 4, JANGAN tambah sekarang. `user_id` PO/adjustment = `session.user.staffId` (bukan id Better Auth string).
- **cURL:** `POST /purchase-orders` sbg kasir → 403; sbg owner → 201; `PATCH .../receive` dua kali → kedua = 400 (sudah received).

---

## D.3 — Modul `sales` (PALING KRITIKAL — uang & stok)

- **Path dasar:** `web/src/app/api/sales/`
- **Model Prisma:** `items`, `transactions`, `transaction_items`, `void_items`, `payment_types`, `tax_settings`, `users`, `customers`
- **Endpoints:**

| Method | Path | RBAC | Input | Logika | Response |
|--------|------|------|-------|--------|----------|
| GET | `/pos-items` | login | query `{ search?, limit?(def 30) }` | jika `search`: items aktif where `name/code ilike` limit. Jika tidak: top-selling 1 bln terakhir (join transaction_items+transactions status completed, group item, sum qty desc); fallback items aktif kalau kosong | `{ data }` |
| GET | `/transactions` | login | query `{ startDate?, endDate?, search?, status?, cashier?, paymentMethod?, page?, limit? }` | list + join user(cashier_name)+payment_type; status map: success→completed, cancelled, void; `endDate` inklusif `+23:59:59`; lampirkan `items_summary`, `items_detail`, `voided_items`; hitung `summary{total_transactions,total_collected,net_sales}` (hanya completed). **Paginasi wajib** + **filter cashier & paymentMethod (Pass#2)** | `{ summary, data, pagination }` |
| GET | `/void-items` | login | query `{ startDate?, endDate? }` | void_items + join item/user/transaction, order created_at desc | `{ data }` |
| POST | `/transactions` | login | body `{ items:[{id:int, price:number, qty:int>0, discount?:number}], payment_type_id:int, payment_amount:number, customer_id?:int, idempotencyKey?:string }` | **(1)** validasi Zod. **(2)** ambil tax_settings; subtotal=Σ(price*qty); `discount_amount`=Σ item.discount (kolom baru); pajak hormati `is_inclusive`; total; change=payment_amount−total. **(3) guard `payment_amount>=total`** else 400. **(4) GUARD ANTI-OVERSELL: cek `item.stock>=qty`** else 400. **(5)** idempotency: header/`Idempotency-Key` unik → tolak duplikat. **(6)** generate `INV-YYYYMMDD-XXXX`; insert transaction + transaction_items (+discount); **decrement stok**. SEMUA dalam **`$transaction`** | `{ message, transaction_id, receipt:{...} }` |
| POST | `/transactions/[id]/void` | **owner/admin** | body `{ items:[{item_id:int, qty:int>0, refund_amount:number}], reason?:string }` | insert void_items; jika `reason==='Returned Goods'` → increment stok; `refunds += Σ`, `net_sales -= Σ`; jika `refunds>=total` set status `void`. **`$transaction`** | `{ message, total_refund }` |

- **Catatan khusus:** `user_id` transaksi = `session.user.staffId`. **Kolom `transaction_items.discount` & idempotency adalah penambahan M2** (lihat prasyarat migration FASE 2 — koordinasi dgn Claude bila kolom belum ada). Decimal: pakai `Prisma.Decimal`, hati-hati pembulatan uang.
- **cURL:** checkout `payment_amount < total` → 400; checkout qty > stok → 400; void sbg kasir → 403; double-submit Idempotency-Key sama → transaksi tunggal.

---

## D.4 — Modul `dashboard`

- **Path dasar:** `web/src/app/api/dashboard/`
- **Model Prisma:** `transactions`, `transaction_items`, `items`
- **Endpoints:**

| Method | Path | RBAC | Input | Logika | Response |
|--------|------|------|-------|--------|----------|
| GET | `/summary` | login | — | `totalSales`=Σ total transaksi completed **hari ini**; `transactionCount`=jumlah; `totalItems`=item aktif | `{ totalSales, transactionCount, totalItems }` |
| GET | `/sales-chart` | login | — | 7 hari terakhir, Σ total completed per tanggal; balikan array urut `{ date:<nama hari ID>, sales:number }` (isi 0 utk hari tanpa transaksi) | `{ data: [...] }` |
| GET | `/top-items` | login | query `{ period?: 'today'\|'month' }` | top 5 item by Σ qty (join transaction_items+transactions completed); filter hari ini / bulan ini | `{ data: [...] }` |

- **Catatan khusus:** paritas saja. FR-DASH-04 (low-stock) & FR-DASH-05 (transaksi terakhir) **JANGAN ditambah** di sini — itu FASE 4.

---

## D.5 — Modul `settings`

- **Path dasar:** `web/src/app/api/settings/`
- **Model Prisma:** `store_settings`, `tax_settings`, `receipt_settings`
- **Endpoints:**

| Method | Path | RBAC | Input | Logika | Response |
|--------|------|------|-------|--------|----------|
| GET | `/store` | login | — | gabung store+tax+receipt (ambil baris pertama tiap tabel; default aman jika kosong) | `{ store_name, address, phone, email, tax_rate, is_tax_active, receipt_footer }` |
| PUT | `/store` | owner/admin | body `{ store_name?, address?, phone?, email?, tax_rate?:number, is_tax_active?:boolean, receipt_footer? }` | upsert store_settings, tax_settings, receipt_settings (insert bila belum ada, else update). Idealnya **`$transaction`** | `{ message }` |

- **Catatan khusus:** mode pajak inklusif (`is_inclusive`) & toggle kolom receipt = FASE 3, jangan sekarang. Validasi `tax_rate` 0–100.

---

## E. PROTOKOL REVIEW (saat diff balik ke Claude)
Claude akan cek: paritas endpoint, kebenaran Zod, RBAC, no N+1, pagination, no leak 5xx, `$transaction` pada operasi kritikal, build hijau. Temuan CRITICAL/HIGH wajib diperbaiki sebelum modul dianggap selesai (Nicho-Brain D6/D7).

