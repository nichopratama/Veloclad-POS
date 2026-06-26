# M3 · Handoff Spec — Halaman **Sales History + Void** (Deputi Mipro)

> Captain Opus menyusun spec & pegang gerbang review. Mipro implementasi penuh di `web/`.
> **Patuhi `docs/M3-handoff-frontend.md` §A (Aturan Global) + §D (Design System).** Dokumen ini = detail teknis halaman C.4.
> **JANGAN** sentuh `api/`/`frontend/` lama, **JANGAN** ubah Route Handler M2 (kontrak fixed). Butuh field baru → lapor Opus.

---

## 1. Tujuan & ruang lingkup

Halaman `/sales`: **riwayat transaksi** (tabel + filter + paginasi + ringkasan), **detail transaksi** (item + item ter-void + cetak ulang struk), dan **aksi Void/refund** (owner/admin). Paritas dengan halaman lama, mengonsumsi API M2 yang sudah ada.

---

## 2. Kontrak API (SUDAH ADA — pakai apa adanya)

### 2.1 `GET /api/sales/transactions` — list + filter + ringkasan + paginasi
Auth: **semua role login** (`requireAuth`).

**Query params** (semua opsional):
| Param | Tipe | Catatan |
|---|---|---|
| `startDate` | `YYYY-MM-DD` | filter `created_at >=` |
| `endDate` | `YYYY-MM-DD` | filter `created_at <=` (inklusif sampai 23:59:59) |
| `search` | string | cocok terhadap **ID transaksi** (`contains`, case-insensitive) |
| `status` | `success` \| `cancelled` \| `void` | ⚠️ `success` dipetakan ke `completed` di DB |
| `cashier` | int | `user_id` staff |
| `paymentMethod` | int | `payment_type_id` |
| `page` | int ≥1 | default `1` |
| `limit` | int 1–100 | default `20` |

**Response 200:**
```jsonc
{
  "summary": {
    "total_transactions": 123,   // number
    "total_collected": 4500000,  // number (Σ total status=completed)
    "net_sales": 4200000         // number (Σ net_sales status=completed)
  },
  "data": [
    {
      "id": "INV-20260626-A1B2",
      "status": "completed",          // 'completed' | 'void' | 'cancelled'
      "created_at": "2026-06-26T...",
      "subtotal": "100000.00",        // ⚠️ Decimal → string di JSON
      "discount_amount": "0.00",
      "tax_amount": "11000.00",
      "total": "111000.00",
      "net_sales": "111000.00",
      "payment_amount": "150000.00",
      "change_amount": "39000.00",
      "refunds": "0.00",              // bisa null
      "cashier_name": "Admin",
      "payment_method": "Tunai",      // bisa null
      "items_summary": "Kopi, Teh",   // nama item digabung koma
      "items_detail": [               // transaction_items[]
        { "item_id": 12, "qty": 2, "price": "25000.00", "discount": "0.00",
          "subtotal": "50000.00", "items": { "name": "Kopi" } }
      ],
      "voided_items": [               // void_items[]
        { "item_id": 12, "qty": 1, "refund_amount": "25000.00", "reason": "Returned Goods",
          "created_at": "...", "items": { "name": "Kopi" }, "users": { "name": "Admin" } }
      ]
    }
  ],
  "pagination": { "total": 123, "page": 1, "limit": 20, "totalPages": 7 }
}
```
> **PENTING (uang):** field uang **per-baris** datang sebagai **string** (`"111000.00"`) → render via `formatIDRFromString`. Field di `summary` sudah **number** → `formatIDR`.

### 2.2 `POST /api/sales/transactions/[id]/void` — void/refund
Auth: **owner/admin** (`requireRole`). Body:
```jsonc
{
  "items": [ { "item_id": 12, "qty": 1, "refund_amount": 25000 } ],  // min 1; qty>0; refund_amount>=0
  "reason": "Returned Goods"   // opsional, default "Returned Goods"
}
```
**Perilaku penting:**
- `reason === "Returned Goods"` → **stok dikembalikan** (increment). Reason lain → stok TIDAK dikembalikan (mis. barang rusak/hilang).
- Bila akumulasi `refunds >= total` → status transaksi otomatis jadi `void`.
- Response 200: `{ "message": "...", "total_refund": 25000 }`.

### 2.3 `GET /api/sales/void-items` — ledger void global *(opsional/sekunder)*
Auth: `requireAuth`. Query `startDate`/`endDate`. Return `{ data: [...] }`.
> Detail void per-transaksi **sudah** tersedia di `data[].voided_items` (2.1). Endpoint ini hanya untuk laporan void global — **opsional**, kerjakan hanya jika sisa waktu cukup.

### 2.4 Dropdown metode bayar
`GET /api/library/payment-types` → `{ data: [{ id, name }] }` untuk isi filter `paymentMethod`.
> **Filter `cashier`:** TIDAK ada endpoint daftar staff yang ter-expose → **OMIT dropdown kasir** untuk sekarang (jangan bikin endpoint baru). Catat sebagai future.

---

## 3. Struktur file (buat baru)

```
web/src/app/(app)/sales/page.tsx          # Server Component tipis: ambil role → render view
web/src/components/sales/
  SalesHistoryView.tsx                     # 'use client' — container: SWR list, state filter/paginasi
  FilterBar.tsx                            # tanggal, status, metode bayar, search (debounce)
  TransactionTable.tsx                     # tabel + badge status + tombol Detail/Void
  TransactionDetailModal.tsx               # items_detail + voided_items + cetak ulang struk
  VoidModal.tsx                            # owner/admin: pilih item+qty+refund+reason → POST
  types.ts                                 # tipe response (mirror §2)
```

**Pola role (ikuti `(app)/layout.tsx`):** `page.tsx` = Server Component, baca `auth.api.getSession({ headers: await headers() })`, ambil `session.user.role ?? 'kasir'`, lalu `<SalesHistoryView role={role} />`. Jangan pakai `useSession` di klien untuk ini.

---

## 4. Reuse WAJIB (jangan tulis ulang)

| Kebutuhan | Pakai |
|---|---|
| GET + cache | `useSWR(\`/api/sales/transactions?${qs}\`, fetcher)` dari `@/lib/fetcher` |
| Mutasi void | `apiMutate('/api/sales/transactions/${id}/void', 'POST', body)` dari `@/lib/fetcher` |
| Error | `FetchError` (punya `.status`) dari `@/lib/fetcher` |
| Uang | `formatIDR` (number) & `formatIDRFromString` (string) dari `@/components/pos/format` |
| Debounce search | `useDebounce` dari `@/components/pos/useDebounce` |
| Revalidate sesudah void | `mutate(key)` SWR pada key list aktif |
| Token & class | `globals.css`: `.card`, `.btn`, `.btn--ghost`, `.input`, `.money`; var `--color-*`, `--space-*`, `--radius*`, `--text-*` |

**Revalidate sesudah void:** panggil `mutate()` pada key list yang sedang aktif (bukan refetch manual). Tombol Void **disable saat submit** (anti double-submit).

---

## 5. UI / UX

- **Kartu ringkasan** (atas): Total Transaksi, Total Diterima (`total_collected`), Penjualan Bersih (`net_sales`). Angka uang pakai class `.money` (mono/tabular).
- **FilterBar:** rentang tanggal (start/end), select status (Semua/Selesai/Void/Batal), select metode bayar (dari §2.4), input search ID (debounce ~300ms). Ubah filter → reset `page` ke 1.
- **Tabel:** kolom ID, Tanggal, Kasir, Metode, Total, Status (Badge), Aksi (Detail + Void). Sticky header, zebra halus. Mobile: hindari overflow horizontal (stack/2-kolom atau scroll terkontrol; target sentuh ≥44px).
- **Badge status semantik:** `completed` → sukses (hijau `--color-success`), `void` → danger (`--color-danger`), `cancelled` → muted/warning. Label ID: "Selesai", "Void", "Batal".
- **Paginasi:** Prev/Next + indikator `page/totalPages`; disable di batas; tampilkan `total`.
- **Detail modal:** daftar `items_detail` (nama, qty, harga, subtotal, diskon) + bagian `voided_items` bila ada (item, qty, refund, alasan, oleh, tanggal) + tombol **Cetak ulang struk** (susun dari field uang transaksi: subtotal/discount/tax/total/payment/change — semuanya string → `formatIDRFromString`).
- **Void modal (owner/admin):** daftar item dari `items_detail`, masing-masing bisa dipilih dengan qty (≤ qty asli) + `refund_amount`, select alasan (**"Barang dikembalikan"** → kirim `reason: "Returned Goods"` (stok balik); opsi lain mis. "Rusak/Hilang" → reason lain, stok tidak balik). Submit → POST → sukses: tutup modal + `mutate` list + banner sukses. Gagal `FetchError`: 401/403 → "Sesi tidak valid / akses ditolak", lainnya → `err.message`.
- **State wajib:** loading (skeleton/teks), error (banner inline ramah — **BUKAN `alert()`**), empty ("Belum ada transaksi").
- **Role-gating:** tombol/aksi **Void** hanya tampil bila `role ∈ {owner, admin}` (API tetap penjaga sebenarnya).

---

## 6. Definition of Done (gerbang Opus)

- [ ] `/sales` fungsional: list + filter (tanggal/status/metode/search) + paginasi + ringkasan, data nyata dari API.
- [ ] Detail modal (items + voided_items + cetak ulang). Void modal owner/admin → POST sukses + revalidate.
- [ ] Uang per-baris pakai `formatIDRFromString` (string), ringkasan `formatIDR` (number). Tak ada salah-tipe.
- [ ] Role-gating Void benar; loading/error/empty ada; error pakai banner (no `alert`).
- [ ] Responsif 360–1440 tanpa overflow horizontal; target sentuh ≥44px; a11y dasar (semantik, fokus, keyboard).
- [ ] Anti-template (≥4 kualitas desain §D); reuse fetcher/format/token (tidak duplikasi).
- [ ] `npm run typecheck` exit 0, `npm run build` hijau, **no `any`**, tak ada `console.log` / token di localStorage.

---

## 7. Catatan & jebakan (dari pelajaran M2)

- Field uang per-baris = **string** Prisma Decimal; jangan dijumlah sebagai number tanpa `Number()`.
- Bangun query string hanya dari filter yang terisi (jangan kirim param kosong → biarkan default server).
- `status=success` di UI → kirim `success` (server yang map ke `completed`); jangan kirim `completed`.
- Jangan kalkulasi pajak/total di klien — semua angka transaksi dari server.
- Satu penulis filesystem (Mipro) untuk task ini. Diff balik ke Opus untuk review + gate sebelum commit.
