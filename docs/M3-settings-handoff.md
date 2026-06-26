# M3 · Handoff Spec — Halaman **Settings** — Deputi Mipro (halaman terakhir M3)

> Captain Opus susun spec & pegang gerbang. Mipro implementasi penuh di `web/`.
> **Patuhi `docs/M3-handoff-frontend.md` §A + §D.** Ini detail teknis halaman C.7.
> **WAJIB baca dulu:** `docs/mipro-feedback-log.md` (A1 no-`any`; cek token CSS terdefinisi; `catch unknown`+`FetchError`; binding input `textValue`).
> **JANGAN** ubah Route Handler M2. Acuan pola form/modal: `web/src/components/inventory/*` & `library/*` (sudah lulus gate).

---

## 1. Tujuan

Halaman `/settings`: **satu form** pengaturan toko (identitas toko, pajak, footer struk). Owner/admin dapat menyimpan; data dari 1 endpoint GET/PUT.

> Menu `/settings` sudah `adminOnly` di Sidebar. Tetap role-gate tombol Simpan (owner/admin) secara defensif.

---

## 2. Kontrak API (SUDAH ADA — pakai apa adanya)

### 2.1 `GET /api/settings/store` · semua role login
⚠️ **Mengembalikan OBJEK FLAT (bukan `{ data }`):**
```jsonc
{
  "store_name": "My Store",     // string (default "My Store" bila kosong)
  "address": "",                // string
  "phone": "",                  // string
  "email": "",                  // string
  "tax_rate": 11,               // number (persen 0–100, BUKAN uang)
  "is_tax_active": true,        // boolean
  "receipt_footer": ""          // string
}
```

### 2.2 `PUT /api/settings/store` · **owner/admin**
Body (semua field opsional — kirim yang diubah; aman kirim semua):
```jsonc
{
  "store_name": "Toko ABC",
  "address": "Jl. ... | null",
  "phone": "08xx | null",
  "email": "a@b.com | null",     // HARUS email valid ATAU null — '' kosong DITOLAK
  "tax_rate": 11,                // number 0–100
  "is_tax_active": true,
  "receipt_footer": "Terima kasih | null"
}
```
- Sukses → `200 { message }`. Validasi gagal (email invalid / tax_rate di luar 0–100) → `400 { error }`.

---

## 3. Struktur file

```
web/src/app/(app)/settings/page.tsx        # Server: role → <SettingsForm role>
web/src/components/settings/
  SettingsForm.tsx                          # 'use client' — SWR GET + form terkontrol + PUT
  types.ts                                  # interface StoreSettings
```
> Pola: `page.tsx` Server Component ambil `role` (seperti `inventory/page.tsx`) → render `<SettingsForm role={role} />`.

---

## 4. Perilaku & UI

- **Muat**: `useSWR<StoreSettings>('/api/settings/store', fetcher)`. Saat data tiba, isi state form (inisialisasi sekali — mis. `useEffect` saat `data` berubah, atau `key` reset). Loading → skeleton/teks; error → banner.
- **Form terkontrol**, field:
  - **Identitas Toko**: `store_name` (text), `address` (textarea), `phone` (text), `email` (email).
  - **Pajak**: `tax_rate` (number, **0–100**, label "Tarif Pajak (%)"), `is_tax_active` (checkbox "Aktifkan pajak").
  - **Struk**: `receipt_footer` (textarea, "Footer struk").
  - Kelompokkan rapi dalam `.card` per-seksi (Toko / Pajak / Struk) — manfaatkan hierarki §D, jangan satu tumpukan input polos.
- **Simpan** (owner/admin): tombol disable saat submitting. Kirim PUT dengan body lengkap. **email kosong → kirim `null`** (bukan `''`), karena server menolak string kosong di `.email()`. Validasi klien: `tax_rate` 0–100, email format bila diisi.
- **Sukses**: tampilkan **banner sukses** (hijau, mis. "Pengaturan tersimpan") + `mutate()` revalidate. **Bukan `alert()`**.
- **Gagal** `FetchError`: 401/403 → "Sesi tidak valid / akses ditolak"; lainnya → `err.message` (mis. 400 validasi). `catch (err: unknown)` + `err instanceof FetchError`.
- **RBAC UI**: non-owner/admin → form read-only / tombol Simpan disembunyikan (walau menu sudah admin-gated).
- **State**: loading, error, sukses; responsif 360–1440 tanpa overflow; target sentuh ≥44px; label terhubung input (a11y), fokus terlihat.

---

## 5. Reuse WAJIB
| Kebutuhan | Pakai |
|---|---|
| GET + cache | `useSWR('/api/settings/store', fetcher)` — `@/lib/fetcher` |
| Mutasi | `apiMutate('/api/settings/store','PUT',body)` — `@/lib/fetcher` |
| Error | `FetchError` (`.status`,`.message`) — `@/lib/fetcher` |
| Token & class | `globals.css`: `.card`,`.btn`,`.btn--ghost`,`.input`; var `--color-*`,`--space-*`,`--radius*`,`--text-*` (token sah saja — lihat feedback log) |

---

## 6. Tipe (no `any`)
```ts
export interface StoreSettings {
  store_name: string;
  address: string;
  phone: string;
  email: string;
  tax_rate: number;
  is_tax_active: boolean;
  receipt_footer: string;
}
```

---

## 7. Definition of Done (gerbang Opus)
- [ ] `/settings` memuat nilai nyata dari GET (objek flat), form terkontrol terisi.
- [ ] Simpan (owner/admin) → PUT sukses → banner sukses + revalidate; email kosong terkirim `null`.
- [ ] Validasi `tax_rate` 0–100 & email; error 400 tampil ramah; 401/403 dibedakan.
- [ ] RBAC UI; loading/error/sukses ada; **no `alert()`**; responsif & a11y dasar.
- [ ] `npm run typecheck` exit 0, `npm run build` hijau, **no `any`**, no `console.log`, no token di localStorage.
- [ ] Anti-template (≥4 kualitas §D): seksi ber-`.card`, hierarki jelas, bukan tumpukan input polos.

## 8. Jebakan
- GET = **objek flat**, bukan `{ data }` — jangan akses `.data`.
- `email` kosong → kirim **`null`** (server tolak `''`).
- `tax_rate` itu **persen 0–100**, bukan uang — jangan `formatIDR`.
- `catch (err: unknown)` + `FetchError` (bukan `any`); pakai token CSS yang terdefinisi.
- Satu penulis filesystem (Mipro). Diff balik ke Opus untuk review + gate sebelum commit.
