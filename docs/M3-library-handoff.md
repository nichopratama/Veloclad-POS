# M3 · Handoff Spec — Halaman **Library** (6 entitas CRUD) — Deputi Mipro

> Captain Opus susun spec & pegang gerbang. Mipro implementasi penuh di `web/`.
> **Patuhi `docs/M3-handoff-frontend.md` §A (Aturan Global) + §D (Design System).** Ini detail teknis halaman C.6.
> **JANGAN** ubah Route Handler M2 (kontrak fixed) / `api/`/`frontend/` lama. Acuan pola: `web/src/components/sales/*` (halaman terakhir yang lulus gate).
> **WAJIB baca dulu:** `docs/mipro-feedback-log.md` — pelajaran kumulatif dari review sebelumnya (mis. larangan `any`/`as any`, pakai `FetchError`). Jangan ulangi yang sudah tercatat di sana.

---

## 1. Tujuan

Halaman `/library`: kelola 6 entitas master via **tab** — **Produk (items)**, **Kategori**, **Pelanggan**, **Supplier**, **Metode Bayar**, **Diskon**. Tiap tab: tabel + search + tombol Tambah + modal create/edit + hapus. Semua data dari API M2.

> **Catatan shell:** menu `/library` sudah `adminOnly` di Sidebar → praktis hanya owner/admin yang sampai sini. Tetap **role-gate tombol mutasi** secara defensif (lihat §4 RBAC).

---

## 2. Pendekatan: **config-driven** (WAJIB — anti-duplikasi)

Bangun **satu** komponen generik `EntityManager` yang di-parameter oleh objek **config per entitas**. JANGAN tulis 6 halaman terpisah yang menyalin-tempel.

```
web/src/app/(app)/library/page.tsx        # 'use client' — tab nav (URL ?tab=) → render <EntityManager config={...}>
web/src/components/library/
  EntityManager.tsx                        # generik: SWR list + search + tabel + modal form + delete
  EntityFormModal.tsx                      # form create/edit dari config.fields
  FieldInput.tsx                           # render 1 field by type (text/number/money/checkbox/email/select-FK)
  entityConfigs.ts                         # 6 config (lihat §3) — SATU sumber kebenaran
  types.ts                                 # FieldDef, EntityConfig, dll
```

### Tipe config (pakai persis ini, no `any`)
```ts
export type FieldType = 'text' | 'textarea' | 'number' | 'money' | 'checkbox' | 'email' | 'select';

export interface FieldDef {
  key: string;                 // nama field DB, mis. 'category_id'
  label: string;               // label ID, mis. 'Kategori'
  type: FieldType;
  required?: boolean;
  defaultValue?: string | number | boolean;
  nullable?: boolean;          // kosong → kirim null
  showInTable?: boolean;       // tampil sebagai kolom tabel
  // khusus type 'select' (foreign key):
  optionsEndpoint?: string;    // mis. '/api/library/categories'
  optionLabelKey?: string;     // 'name'
  optionValueKey?: string;     // 'id'
}

export interface EntityConfig {
  key: string;                 // 'items'
  label: string;               // 'Produk'
  endpoint: string;            // '/api/library/items'
  paginated: boolean;          // items=true; lainnya=false
  searchable: boolean;         // payment-types=false; lainnya=true
  mutateRoles: 'admin' | 'all';// create+update: 'all'=semua login (customers); 'admin'=owner/admin
  fields: FieldDef[];          // urutan render form + kolom tabel
}
```
`EntityManager` menerima `config` + `role`. Delete **selalu** owner/admin. Create/Update sesuai `config.mutateRoles`.

---

## 3. Kontrak API per entitas (SUDAH ADA — pakai apa adanya)

**Umum:**
- GET list: semua role login. Response items = `{ data, pagination }`; **lainnya `{ data }`** (tanpa pagination).
- Search: query `?search=` (kecuali payment-types — tanpa search). items juga `?page=&limit=` (default limit 30).
- Create `POST endpoint` → `201 { message, id }`. Update `PUT endpoint/[id]` → `{ message }`. Delete `DELETE endpoint/[id]` → `{ message }`.
- Error → `{ error: string }` (status 400/401/403/404/500). `fetcher`/`apiMutate` sudah baca `body.error` ke `FetchError.message`.
- **Uang balik sebagai string** (Prisma Decimal): `items.price`, `items.hpp`, `discounts.value`, `discounts.max_value` → tampil via `formatIDRFromString`.
- Hapus yang masih dipakai → 400 `"...referenced..."` (P2003). `items.code` unik → 400 `"Item code already exists"` (P2002). Surface pesan ini di banner form/aksi.

### 3.1 items — `/api/library/items` · **paginated** · search name+code · mutateRoles: **admin**
Field (form & tabel): `code`(text,req), `name`(text,req), `category_id`(select→categories,nullable), `supplier_id`(select→suppliers,nullable), `unit`(text,default 'pcs'), `price`(money,req), `hpp`(money,default 0), `stock`(number,default 0), `min_stock`(number,default 0), `is_active`(checkbox,default true). Opsional (boleh di form, bukan kolom tabel): `internal_id`,`variant_name`,`brand_name`,`condition`,`image_url` (text,nullable).
GET item include `categories` & `suppliers` (nested object) → tabel bisa tampil `categories?.name`.
Kolom tabel saran: code, name, kategori, price, stock, is_active.

### 3.2 categories — `/api/library/categories` · flat · search name · mutateRoles: **admin**
Field: `name`(text,req), `description`(textarea,nullable).

### 3.3 customers — `/api/library/customers` · flat · search name/phone/email · mutateRoles: **all**
Field: `name`(text,req), `phone`(text,nullable), `email`(email,nullable — string kosong→null), `address`(textarea,nullable), `points`(number,default 0).
> Delete tetap owner/admin (beda dari create/update yang 'all').

### 3.4 suppliers — `/api/library/suppliers` · flat · search name/contact/email · mutateRoles: **admin**
Field: `name`(text,req), `contact`(text,nullable), `phone`(text,nullable), `email`(email,nullable), `address`(textarea,nullable), `npwp`(text,nullable), `is_active`(checkbox,default true).

### 3.5 payment-types — `/api/library/payment-types` · flat · **NO search** · mutateRoles: **admin**
Field: `name`(text,req), `type`(text,req), `is_active`(checkbox,default true).

### 3.6 discounts — `/api/library/discounts` · flat · search name · mutateRoles: **admin**
Field: `name`(text,req), `type`(text,req), `value`(money,req), `max_value`(money,nullable), `is_active`(checkbox,default true).

---

## 4. Perilaku & UI

- **Tab nav** = URL search param `?tab=items|categories|customers|suppliers|payment-types|discounts` (URL-as-state; default `items`). Ganti tab → ganti config.
- **List**: `useSWR(key, fetcher)` di `@/lib/fetcher`. Key items = `${endpoint}?page=${page}&limit=20${search?...}`; lainnya = `${endpoint}${searchable&&search?`?search=${q}`:''}`. **items**: render paginasi (Prev/Next, disable di batas) seperti `sales/TransactionTable.tsx`. Search debounce 300ms via `useDebounce` (`@/components/pos/useDebounce`).
- **Tabel**: kolom dari `fields.filter(showInTable)` + kolom Aksi (Edit / Hapus). Uang → `formatIDRFromString`. checkbox/bool → badge "Aktif/Nonaktif". select-FK → tampil label nested (mis. `row.categories?.name`) atau '-'.
- **Form modal** (`EntityFormModal`): render field dari `config.fields` lewat `FieldInput`. Mode create (kosong/default) & edit (prefill row). `select`-FK: muat opsi via SWR dari `optionsEndpoint` (`{data}` → map label/value). `money`/`number`: `<input type=number>`, kirim sebagai **number** (bukan string) — `Number(value)`. `nullable` + kosong → kirim `null` (untuk email kosong boleh kirim `''`, server normalisasi). Submit:
  - create → `apiMutate(endpoint,'POST',body)`; edit → `apiMutate(`${endpoint}/${id}`,'PUT',body)`.
  - Sukses → tutup modal + `mutate()` list. Tombol submit **disable saat submitting** (anti double-submit).
  - Gagal `FetchError`: 401/403 → "Sesi tidak valid / akses ditolak"; lainnya → `err.message` (mis. "Item code already exists") di banner modal. **Pakai `catch (err: unknown)` + `err instanceof FetchError`** (BUKAN `catch (err: any)`).
- **Delete**: konfirmasi (modal/confirm sederhana) → `apiMutate(`${endpoint}/${id}`,'DELETE')` → `mutate()`. Error P2003 ("referenced...") tampil sebagai banner/toast ramah, jangan crash.
- **RBAC UI**: tombol **Tambah/Edit** tampil bila (`config.mutateRoles==='all'`) atau `role∈{owner,admin}`. Tombol **Hapus** hanya `role∈{owner,admin}`. (API tetap penjaga sebenarnya.)
- **State wajib**: loading (skeleton/teks), error (banner ramah, **no `alert()`**), empty ("Belum ada data").
- **Responsif** 360–1440 tanpa overflow horizontal (tabel `overflow-x:auto` seperti sales); target sentuh ≥44px. a11y: `role="dialog"`/`aria-modal` di modal, label form, fokus terlihat.

---

## 5. Reuse WAJIB (jangan tulis ulang)
| Kebutuhan | Pakai |
|---|---|
| GET + cache | `useSWR(key, fetcher)` — `@/lib/fetcher` |
| Mutasi | `apiMutate(url, 'POST'|'PUT'|'DELETE', body?)` — `@/lib/fetcher` |
| Error | `FetchError` (`.status`,`.message`) — `@/lib/fetcher` |
| Uang | `formatIDRFromString` — `@/components/pos/format` |
| Debounce | `useDebounce` — `@/components/pos/useDebounce` |
| Token & class | `globals.css`: `.card`,`.btn`,`.btn--ghost`,`.input`,`.money`; var `--color-*`,`--space-*`,`--radius*`,`--text-*` |
| Pola tabel+paginasi+modal | contoh nyata di `web/src/components/sales/TransactionTable.tsx` & `VoidModal.tsx` |

---

## 6. Definition of Done (gerbang Opus)
- [ ] `/library` 6 tab jalan (URL `?tab=`); tiap entitas: list + search (kecuali payment-types) + create + edit + delete, data nyata dari API.
- [ ] **items** berpaginasi (page/limit) + search name/code; FK kategori/supplier via dropdown (opsi dari endpoint masing-masing).
- [ ] Uang (`items.price/hpp`, `discounts.value/max_value`) baca sebagai string (`formatIDRFromString`); dikirim sebagai number.
- [ ] RBAC UI: customers create/update 'all', sisanya owner/admin; delete selalu owner/admin.
- [ ] Error contract tampil ramah (code unik, referenced/P2003, 401/403); loading & empty ada; **no `alert()`**.
- [ ] `npm run typecheck` exit 0, `npm run build` hijau, **no `any`** (no `as any`, no `catch any`), no `console.log`, no token di localStorage.
- [ ] Anti-template (≥4 kualitas §D); reuse fetcher/format/token (config-driven, bukan 6 salinan).

---

## 7. Jebakan (dari pelajaran M2/M3)
- Bangun query string hanya dari filter terisi; jangan kirim `?search=` kosong.
- payment-types **tak punya** search/pagination — config `searchable:false`, jangan kirim param.
- Uang & number dikirim sebagai **number** (`Number(x)`), bukan string; sebaliknya tampilan dari GET = string.
- FK nullable (category_id/supplier_id) kosong → kirim `null`, bukan `0`/`''`.
- JANGAN `catch (err: any)` — pakai `unknown` + `err instanceof FetchError` (alasan: lulus gate no-any; lihat fix VoidModal commit 383a41b).
- Satu penulis filesystem (Mipro). Diff balik ke Opus untuk review + gate sebelum commit.
