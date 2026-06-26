# M3 · Handoff Spec — Halaman **Inventory** — Deputi Mipro

> Captain Opus susun spec & pegang gerbang. Mipro implementasi penuh di `web/`.
> **Patuhi `docs/M3-handoff-frontend.md` §A + §D.** Ini detail teknis halaman C.5.
> **WAJIB baca dulu:** `docs/mipro-feedback-log.md` — terutama **A1 (dilarang `any`)** & pelajaran Library (generic = pakai `unknown`+narrow, bukan `any`; binding input pakai `textValue`). **Jangan ulangi.**
> **JANGAN** ubah Route Handler M2 / `api/`/`frontend/` lama. Acuan pola: `web/src/components/sales/*` & `web/src/components/library/*` (sudah lulus gate).

---

## 1. Tujuan

Halaman `/inventory` dengan **3 tab** (nav via URL `?tab=`):
1. **Stock Summary** — daftar stok (paginasi + search), sorot **stok menipis** (`stock <= min_stock`). Read-only.
2. **Purchase Orders (PO)** — daftar PO + **Buat PO** + **Terima** (pending → received, menambah stok).
3. **Adjustments** — daftar penyesuaian stok + **Buat Penyesuaian** (tambah/kurang stok manual).

> Tab default `stock`. Menu `/inventory` sudah `adminOnly` di Sidebar; tetap role-gate aksi tulis (owner/admin) secara defensif.

---

## 2. Kontrak API (SUDAH ADA — pakai apa adanya)

> Uang Decimal balik **string** (`total_amount`, `cost`) → tampil `formatIDRFromString`; dikirim sebagai **number**.

### 2.1 Stock Summary — `GET /api/inventory/stock-summary` · **paginated** · semua role
Query: `page`(default 1), `limit`(default 30), `search` (name/code). Response:
```jsonc
{ "data": [ { "id":1, "name":"...", "code":"...", "stock":5, "min_stock":10,
   "price":"15000.00", "unit":"pcs", "is_active":true,
   "categories": { "name":"..." } | null, "suppliers": { "name":"..." } | null } ],
  "pagination": { "total","page","limit","totalPages" } }
```
- **Low-stock**: `stock <= min_stock` → baris/badge danger atau warning. (read-only; tak ada aksi tulis di tab ini)

### 2.2 Purchase Orders — `GET /api/inventory/purchase-orders` · flat · semua role
Response:
```jsonc
{ "data": [ { "id":12, "po_number":"PO-20260626-AB12", "supplier_id":3, "user_id":1,
   "status":"pending", "total_amount":"500000.00", "notes":null,
   "created_at":"...", "suppliers": { "name":"..." } | null, "users": { "name":"..." } | null } ] }
```
> ⚠️ **GET PO TIDAK menyertakan `po_items`** (baris detail). Tabel PO tampilkan **header** saja (po_number, supplier, status, total, tanggal, dibuat-oleh). **Jangan** bikin endpoint detail baru — fitur "lihat baris PO" di luar scope M2.
- `status`: `"pending"` | `"received"`. Badge: pending → warning, received → success.

### 2.3 Buat PO — `POST /api/inventory/purchase-orders` · **owner/admin**
Body:
```jsonc
{ "supplier_id": 3, "notes": "opsional",
  "items": [ { "item_id": 1, "qty": 10, "cost": 12000 } ] }  // items min 1; qty>0; cost>=0
```
- `total_amount` dihitung **server** (Σ cost×qty) — klien boleh tampilkan **preview** saja, jangan kirim total.
- Sukses → `201 { message, po_number }`. Bentrok nomor (langka) → `409` ("coba lagi"). Validasi gagal → 400.

### 2.4 Terima PO — `PATCH /api/inventory/purchase-orders/[id]/receive` · **owner/admin** · **tanpa body**
- Hanya PO `status==='pending'` → jadi `received` + **stok tiap item bertambah** (atomic).
- Sukses → `200 { message }`. Sudah diterima/bukan pending → `400`. Tak ada → `404`.
- UI: tombol **Terima** hanya muncul saat `status==='pending'`. Konfirmasi dulu → PATCH → `mutate()`.

### 2.5 Adjustments — `GET /api/inventory/adjustments` · flat · semua role
```jsonc
{ "data": [ { "id":1, "item_id":5, "user_id":1, "qty_change":-3, "reason":"Rusak",
   "notes":null, "created_at":"...", "items": { "name":"..." } | null, "users": { "name":"..." } | null } ] }
```
- `qty_change` bisa **negatif** (kurangi) atau positif (tambah). Tampilkan dengan tanda + warna (hijau +, merah −).

### 2.6 Buat Adjustment — `POST /api/inventory/adjustments` · **owner/admin**
Body:
```jsonc
{ "item_id": 5, "qty_change": -3, "reason": "Stok Opname", "notes": "opsional" }
```
- `qty_change` **≠ 0** (boleh negatif). `reason` **wajib** (string). Sukses → `201 { message }`. Item tak ada → `404`. Validasi → 400.

### 2.7 Picklist (untuk form)
- **Item** (PO & Adjustment): `GET /api/library/items?search=&limit=20` → `{ data:[{id,name,code,...}], pagination }`. Pakai search + debounce.
- **Supplier** (PO): `GET /api/library/suppliers` → `{ data:[{id,name}] }`.

---

## 3. Struktur file (config ringan / per-tab, BUKAN 6× salin)

```
web/src/app/(app)/inventory/page.tsx        # Server: role → render <InventoryView role>
web/src/components/inventory/
  InventoryView.tsx                          # 'use client' — tab nav (URL ?tab=) → render tab aktif
  StockSummaryTab.tsx                         # SWR paginated + search + low-stock highlight
  PurchaseOrdersTab.tsx                       # SWR list + badge status + tombol Buat PO / Terima
  PoFormModal.tsx                             # supplier select + baris item dinamis (search+qty+cost) + preview total
  AdjustmentsTab.tsx                          # SWR list + tombol Buat Penyesuaian
  AdjustmentFormModal.tsx                     # item select + qty_change(+/-) + reason + notes
  types.ts                                    # tipe StockItem, PurchaseOrder, Adjustment, PickItem, Supplier
```
> Tab via URL `?tab=stock|po|adjustments` (ikuti pola `library/page.tsx`). Boleh Server Component tipis untuk ambil `role` lalu lempar ke `InventoryView` client.

---

## 4. Perilaku & UI penting

- **Stock Summary**: tabel kolom Kode, Nama, Kategori, Stok, Min, Harga. Baris low-stock (`stock<=min_stock`) diberi badge "Menipis" (warning) atau teks merah. Search debounce 300ms; paginasi seperti `sales/TransactionTable.tsx`.
- **Purchase Orders**: tabel header PO (po_number mono, supplier, status badge, total uang, tanggal, oleh). Tombol **Buat PO** (owner/admin). Tombol **Terima** per baris hanya bila `status==='pending'` (owner/admin) → `confirm()` → PATCH → `mutate()`.
- **PoFormModal**: pilih supplier (select dari suppliers), lalu **daftar baris item dinamis** — tiap baris: cari item (input search → dropdown hasil dari `/api/library/items?search=`), qty (number>0), cost (money/number≥0). Tombol "+ Tambah baris" & hapus baris. **Preview total** = Σ cost×qty (klien, sekadar tampilan). Submit kirim `{supplier_id, notes?, items:[{item_id,qty,cost}]}`. Minimal 1 baris valid.
- **AdjustmentsTab**: tabel (item, qty_change ber-tanda+warna, reason, notes, oleh, tanggal). Tombol **Buat Penyesuaian** (owner/admin).
- **AdjustmentFormModal**: pilih item (search), `qty_change` (number, boleh negatif, **≠0**), `reason` (wajib — boleh select preset: "Stok Opname"/"Rusak"/"Hilang"/"Koreksi" + opsi bebas, atau input teks), `notes` (opsional). Submit POST.
- **Semua mutasi**: tombol submit **disable saat submitting**; sukses → tutup modal + `mutate()`; gagal → banner ramah. **`catch (err: unknown)` + `err instanceof FetchError`** (401/403 → "Sesi tidak valid / akses ditolak"; lainnya → `err.message`, mis. PO 409 / adjustment 404). **JANGAN `alert()`** untuk error (boleh `confirm()` untuk konfirmasi Terima/hapus baris).
- **State wajib**: loading, error (banner), empty per tab.
- **RBAC UI**: aksi Buat PO / Terima / Buat Adjustment hanya `role∈{owner,admin}`. Stock Summary read-only.
- **Responsif** 360–1440 tanpa overflow (tabel `overflow-x:auto`); target sentuh ≥44px; modal `role="dialog"`/`aria-modal`, label form, fokus terlihat.

---

## 5. Reuse WAJIB
| Kebutuhan | Pakai |
|---|---|
| GET + cache | `useSWR(key, fetcher)` — `@/lib/fetcher` |
| Mutasi | `apiMutate(url,'POST'|'PATCH',body?)` — `@/lib/fetcher` |
| Error | `FetchError` (`.status`,`.message`) — `@/lib/fetcher` |
| Uang | `formatIDRFromString` — `@/components/pos/format` |
| Debounce search | `useDebounce` — `@/components/pos/useDebounce` |
| Token & class | `globals.css`: `.card`,`.btn`,`.btn--ghost`,`.input`,`.money`; var `--color-*`,`--space-*`,`--radius*`,`--text-*` |
| Pola tabel+paginasi+modal | `web/src/components/sales/*`, `web/src/components/library/*` |

---

## 6. Tipe (no `any` — pelajaran Library)
Definisikan eksplisit di `types.ts`, mis.:
```ts
export interface StockItem { id:number; name:string; code:string; stock:number; min_stock:number; price:string; unit:string|null; is_active:boolean; categories:{name:string}|null; suppliers:{name:string}|null; }
export interface PurchaseOrder { id:number; po_number:string; status:string; total_amount:string; notes:string|null; created_at:string; suppliers:{name:string}|null; users:{name:string}|null; }
export interface Adjustment { id:number; item_id:number|null; qty_change:number; reason:string; notes:string|null; created_at:string; items:{name:string}|null; users:{name:string}|null; }
export interface PickItem { id:number; name:string; code:string; }
export interface PoLine { item_id:number; name:string; qty:number; cost:number; }
```
- Nilai dinamis → `unknown` lalu narrow; **jangan** `useSWR<any>` / `(x:any)`. Lihat `library/types.ts` sebagai contoh yang sudah benar.

---

## 7. Definition of Done (gerbang Opus)
- [ ] 3 tab jalan (URL `?tab=`): Stock (paginasi+search+low-stock), PO (list+buat+terima), Adjustments (list+buat) — data nyata.
- [ ] PO create: supplier + baris item dinamis (search picklist), preview total; receive hanya pending, stok bertambah.
- [ ] Adjustment: qty_change boleh negatif & ≠0; reason wajib; stok berubah sesuai tanda.
- [ ] Uang (`total_amount`) baca string, dikirim number; status badge benar (pending/received).
- [ ] RBAC UI (owner/admin) untuk aksi tulis; loading/error/empty ada; no `alert()` untuk error.
- [ ] `npm run typecheck` exit 0, `npm run build` hijau, **no `any`**, no `console.log`, no token di localStorage.
- [ ] Anti-template (≥4 kualitas §D); reuse helper/komponen (jangan tulis ulang).

## 8. Jebakan
- GET PO **tanpa** `po_items` → jangan render baris detail; jangan bikin endpoint baru.
- `qty_change` negatif itu **valid** (kurangi stok) — jangan paksa positif; cuma larang 0.
- Receive **tanpa body** (PATCH) — jangan kirim payload.
- Item/cost dikirim **number** (`Number()`); tampilan uang dari GET = string.
- `catch (err: unknown)` + `FetchError` (bukan `any`). Generic/dinamis → `unknown`+narrow.
- Satu penulis filesystem (Mipro). Diff balik ke Opus untuk review + gate sebelum commit.
