# Log Umpan Balik — Deputi Mipro (Gemini 3.1 Pro)

> Catatan kumulatif dari **review + gate Captain Opus** atas implementasi Mipro.
> **Mipro: baca dokumen ini SEBELUM mulai tiap halaman** — jangan ulangi kesalahan yang sudah tercatat.
> Format tiap entri: **❌ salah → ✅ benar → 💡 alasan** (+ rujukan commit/file).

---

## A. Aturan keras (sering terlanggar)

### A1 — Dilarang `any` dalam bentuk apa pun
- ❌ `receipt={{ ... } as any}` · ❌ `catch (err: any) { err.status }`
- ✅ Kalau objek sudah cocok tipenya, **buang** `as any` (TypeScript akan terima). Untuk error: `catch (err: unknown)` lalu `if (err instanceof FetchError) { err.status / err.message }`.
- 💡 DoD M3 melarang `any` (hilangkan keamanan tipe). `as any` hampir selalu menutupi tipe yang sebenarnya **sudah benar** atau bug yang harus diperbaiki, bukan disembunyikan.
- 📌 Rujukan: fix Sales History, commit `383a41b` (`TransactionDetailModal`, `VoidModal`).

---

## B. Pelajaran per halaman

### Inventory (3 tab: stock/PO/adjustments) — 1 temuan kecil 📈 TERBERSIH
**Tren naik tajam:** nol `any` (tipe eksplisit StockItem/PurchaseOrder/Adjustment/PickItem/Supplier, `useSWR<PaginatedResponse<T>>`), `catch unknown`+`FetchError` konsisten, reuse penuh, low-stock highlight, receive pending-only, adjustment negatif + validasi qty≠0, picklist debounce. **Pelajaran A1 & Library sudah benar-benar diterapkan.** 👏
- ❌ (satu-satunya) `background: var(--color-background-muted)` — token tak terdefinisi → style no-op.
- ✅ Pakai token yang ADA: `--color-surface-2`. 
- 💡 **Sebelum pakai `var(--color-...)`, pastikan token terdefinisi di `globals.css` `:root`.** Token sah: `--color-bg/-surface/-surface-2/-border/-text/-text-muted/-accent(-hover/-soft)/-success/-danger/-warning`. Jangan mengarang nama token.
- 📌 Rujukan: fix `AdjustmentFormModal.tsx`.

### Library / 6 entitas config-driven — 12 temuan `any` (1 pola, berulang)
**Inti masalah:** generic config-driven dibangun dengan `any` di mana-mana (`useSWR<any>`, `row: any`, `value: any`, `Record<string, any>`, `(opt: any)`, `(optionsData as any)`). Ini melanggar A1 dan menghapus seluruh manfaat tipe.
- ❌ `const items: any[] = ...` · `useSWR<any>` · `(row: any) => ...`
- ✅ Definisikan tipe domain sekali, pakai ulang:
  ```ts
  export type FormValue = string | number | boolean | null;          // nilai form scalar
  export interface EntityRow { id: number | string; [k: string]: unknown; }  // baris API
  export interface LibraryListResponse { data: EntityRow[]; pagination?: {...}; }
  ```
  lalu `useSWR<LibraryListResponse, FetchError>`, `row: EntityRow`, `value: FormValue`.
- 💡 **Generic BUKAN alasan pakai `any`.** Nilai dinamis = `unknown` (bukan `any`), lalu **narrow saat render**: `String(val ?? 0)` untuk teks/uang, `val ? 'Aktif':'Nonaktif'` untuk bool, `row[key] as Record<string, unknown>` untuk objek nested. `unknown` boleh dipakai di kondisi/`String()` tanpa cast.
- 💡 **Pola binding input** yang aman tipe: hitung sekali `const textValue = value == null ? '' : String(value);` lalu `value={textValue}` di semua `<input>`/`<select>`. Jangan `value={value || ''}` (boleh bocor `boolean`).
- 📌 Rujukan fix: commit (Library), `types.ts` (tipe baru) + `EntityManager/EntityFormModal/FieldInput`.
- ✔️ **Yang sudah bagus (pertahankan):** struktur config-driven persis spec; `catch (err: unknown)` + `FetchError` (A1 sudah diterapkan di sini! 👏); RBAC `canMutate`/`canDelete`; `mutate()` sesudah aksi; tombol submit disable saat submit; tab via URL `?tab=`; tabel `overflow-x:auto`; empty/loading/error state lengkap. **Kualitas naik dari Sales History.**

### Sales History + Void (commit 383a41b) — 2 temuan
1. `as any` pada reuse `ReceiptModal` → objek **sudah** persis `TransactionReceipt`; cukup hapus `as any`. (lihat A1)
2. `catch (err: any)` akses `.status` → ganti `unknown` + `err instanceof FetchError`. (lihat A1)
- ✔️ Yang **sudah bagus** (pertahankan): reuse `fetcher`/`apiMutate`/`formatIDR(FromString)`/`useDebounce`/token desain; role-gating tombol Void; `mutate()` revalidate sesudah aksi; tombol disable saat submit; modal `role="dialog"`/`aria-modal`; tabel `overflow-x:auto`.

---

## C. Checklist cepat sebelum serahkan diff (self-check Mipro)
- [ ] `grep` sendiri: tak ada ` any`, `as any`, `console.log`, `localStorage` di file baru.
- [ ] Uang dari GET dibaca sebagai **string** (`formatIDRFromString`); dikirim ke API sebagai **number** (`Number()`).
- [ ] Query string hanya berisi param terisi (jangan kirim `?search=` kosong).
- [ ] Error pakai banner ramah (BUKAN `alert()`), dan bedakan 401/403 vs lainnya via `FetchError`.
- [ ] `mutate()` dipanggil sesudah create/update/delete/void; tombol submit disable saat proses.
- [ ] Reuse helper/komponen yang ada — jangan tulis ulang fetcher/format/modal.
- [ ] `npm run typecheck` exit 0 & `npm run build` hijau **sebelum** serahkan.
