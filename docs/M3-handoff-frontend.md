# M3 — Handoff Spec: Frontend Next.js (untuk Skuad)

> Migrasi UI React/Vite lama → **Next.js App Router** di `web/`, mengonsumsi API M2 + auth Better Auth.
> Pola sama seperti `M2-handoff-template.md`: Captain Opus menyusun spec & **gerbang review**; deputi/officer implementasi per-halaman; diff balik ke Opus untuk gate.
> **Prasyarat:** M0–M2 selesai (API + auth siap). App lama (port 3020) tetap jalan sampai M4 cutover.

---

## A. ATURAN GLOBAL (wajib semua halaman)

1. **Auth = Better Auth cookie**, BUKAN localStorage/JWT. Pakai `@/lib/auth-client` (`useSession`, `signIn`, `signOut`). Tak ada token di JS/localStorage.
2. **Fetch same-origin**: panggil API M2 via `fetch('/api/...')` — cookie httpOnly terkirim otomatis (origin sama). Untuk POST/PUT/DELETE sertakan `headers: { 'Content-Type': 'application/json' }` dan **Origin terkirim otomatis** (CSRF Better Auth).
3. **Server state**: pakai **SWR** untuk GET (cache + revalidate); mutasi (POST/PUT/DELETE) via `fetch` lalu `mutate()` re-validate. Jangan duplikasi server-state ke store global.
4. **Client vs Server Component**: default Server Component; tambahkan `"use client"` hanya bila ada state/efek/event (POS, form, chart interaktif).
5. **Route protection**: middleware Next.js cek session (redirect ke `/login` bila tak ada). **Role-gating UI**: sembunyikan aksi owner/admin dari kasir — tapi ingat **API tetap penjaga sebenarnya** (render-gating ≠ keamanan).
6. **Loading & error states**: tiap fetch punya skeleton/loading + pesan error ramah (toast, BUKAN `alert()` — Nicho-Brain D4). Bungkus area kritis dengan `error.tsx`/ErrorBoundary (anti white-screen, Gate#3).
7. **Responsive (D20)**: **mobile-first**, **zero horizontal overflow** 360–1440px, target sentuh ≥44px (kasir sering pakai tablet). POS harus nyaman di tablet.
8. **a11y (D15)**: HTML semantik, navigasi keyboard, kontras cukup, focus state terlihat, hormati `prefers-reduced-motion`.
9. **Anti-template (web/design-quality)**: JANGAN UI template generik. Ikuti arah desain & token di §D. Minimal 4 kualitas: hierarki skala, ritme spasi, kedalaman/layer, tipografi berkarakter, warna semantik, state hover/focus terdesain.
10. **TypeScript strict**, no `any`. Tipe response API diketik (mirror dari kontrak §C).
11. **JANGAN sentuh** `api/` & `frontend/` lama, dan **jangan ubah** Route Handler M2 (kontrak sudah fix). Jika butуh field baru → koordinasi dgn Captain Opus.

### Definition of Done per halaman
- [ ] Fungsional paritas dengan halaman lama (atau sesuai spec halaman).
- [ ] Auth/role-gating benar; data dari API M2 (bukan dummy).
- [ ] Loading + error + empty state ada.
- [ ] Responsif 360–1440 tanpa overflow; touch target ≥44px.
- [ ] `npm run typecheck` & `npm run build` hijau; no `any`.
- [ ] Tak ada `console.log` sisa; tak ada token di localStorage.

---

## B. APP SHELL & FONDASI *(Captain Opus spec → Deputi Sonet implementasi)*

- **Struktur route (App Router):**
  ```
  web/src/app/
    login/page.tsx                 # publik
    (app)/layout.tsx               # shell terproteksi: Sidebar + Header + <AuthProvider>
    (app)/page.tsx                 # Dashboard (index)
    (app)/pos/page.tsx             # Kasir/POS
    (app)/sales/page.tsx           # Riwayat transaksi + void
    (app)/inventory/page.tsx
    (app)/library/...              # tab/route per entitas
    (app)/settings/page.tsx
    middleware.ts                  # guard session
  ```
- **`middleware.ts`**: cek session Better Auth; tanpa session → redirect `/login`. (Better Auth sediakan helper cek cookie session.)
- **Provider**: bungkus app dengan client provider untuk SWR config + session. `useSession` dari `@/lib/auth-client`.
- **Layout**: Sidebar (navigasi modul, sembunyikan menu admin dari kasir) + Header (nama toko dari `/api/settings/store`, user + tombol logout `signOut`).
- **Logout**: `signOut()` → redirect `/login` (session ter-revoke di server — beda dari hapus localStorage lama).

---

## C. SPESIFIKASI PER-HALAMAN (+ kontrak API & pelaksana)

> Kontrak = endpoint M2 (lihat `M2-handoff-template.md`). Semua GET → bentuk `{ data, ... }`.

### C.1 Login — *Deputi Sonet*
- Route `/login`. Form email+password → `signIn.email({ email, password })`.
- Sukses → redirect `/`. Gagal → toast "Email atau password salah".
- Tak ada akses bila sudah login (redirect `/`).

### C.2 Dashboard — *Deputi Sonet* (visual/charts)
- API: `GET /api/dashboard/summary`, `/sales-chart`, `/top-items?period=today|month`.
- Komponen: kartu ringkasan (totalSales, transactionCount, totalItems), grafik penjualan 7 hari (recharts/setara), daftar top item (toggle today/month).
- Semua role login.

### C.3 POS / Kasir — *Deputi Sonet* (interaktif, kritikal UX)
- API: `GET /api/sales/pos-items?search=&limit=`, `GET /api/library/customers`, `GET /api/library/payment-types`, `POST /api/sales/transactions`.
- Fitur: cari produk (debounce), keranjang (qty, harga, subtotal, **diskon per item**), pilih pelanggan (opsional), pilih metode bayar, input bayar → **hitung kembalian**, tombol Bayar.
- **Idempotency:** generate `idempotencyKey` (uuid) per transaksi di klien, kirim di body — cegah double-submit (tombol disable saat submit).
- Setelah sukses → tampilkan struk + opsi cetak (jsPDF). Reset keranjang.
- Cart state: `useReducer`/Zustand (client).

### C.4 Sales History + Void — *Deputi Mipro* (tabel data berat)
- API: `GET /api/sales/transactions?startDate&endDate&search&status&cashier&paymentMethod&page&limit`, `GET /api/sales/void-items`, `POST /api/sales/transactions/[id]/void`.
- Tabel transaksi + filter (tanggal, status, kasir, metode) + **paginasi** + kartu ringкasan (summary).
- Detail transaksi (items_detail, voided_items) + cetak ulang struk.
- Aksi **Void** (owner/admin) → modal pilih item+qty+refund+alasan → POST void.

### C.5 Inventory — *Deputi Mipro*
- API: `GET /api/inventory/stock-summary?page&limit&search`, `GET/POST /api/inventory/purchase-orders`, `PATCH /api/inventory/purchase-orders/[id]/receive`, `GET/POST /api/inventory/adjustments`.
- Tab: Stock Summary (paginasi+search), Purchase Orders (list + buat PO + terima), Adjustments (list + buat). Buat PO/terima/adjust = owner/admin.

### C.6 Library — *Deputi Mipro* (6 entitas CRUD, mekanis)
- API: `/api/library/{items,categories,customers,suppliers,payment-types,discounts}` (+`[id]`).
- Tab per entitas: tabel + search + modal create/edit + delete. `items` paginasi.
- RBAC UI: create/update/delete master = owner/admin; customers create/update = semua login, delete = owner/admin.

### C.7 Settings — *Deputi Mipro*
- API: `GET/PUT /api/settings/store` (owner/admin utk PUT).
- Form: nama toko, alamat, telepon, email, tarif pajak + aktif, footer struk. Validasi `tax_rate` 0–100.

### Dukungan skuad
- **Officer Haiku:** generate test komponen (React Testing Library), edit kecil, commit message, update docs.
- **Officer Miflash:** draft data demo/seed tampilan, teks i18n/струk, format aset.

---

## D. DESIGN SYSTEM & ARAH VISUAL *(Captain Opus tetapkan → Sonet kembangkan)*

- **Arah:** *"Modern SaaS dashboard — light, disiplin, ringan-premium"* (BUKAN dark-mode default, BUKAN template Tailwind polos). Fokus keterbacaan kasir + kepadatan data terkontrol.
- **Token (CSS variables / Tailwind theme):** definisikan palet (surface, text, accent semantik: sukses/danger/warning untuk uang & stok), skala tipografi (hero/heading/body/mono untuk angka uang), spasi berirama, radius & shadow konsisten. **Angka uang pakai font mono/tabular** agar rapi.
- **Komponen inti:** Button (varian + state), Card/Surface, Table (sticky header, zebra halus), Modal/Dialog, Toast, Input/Select, Badge status (completed/void/cancelled), Skeleton.
- **Motion:** hanya `transform`/`opacity`; hormati `prefers-reduced-motion`.
- Referensi kualitas: `web/design-quality.md` (checklist komponen).

---

## E. PROTOKOL REVIEW (Captain Opus — gerbang)
Tiap halaman diperiksa: auth/role benar, data nyata dari API, loading/error/empty state, responsif tanpa overflow, a11y dasar, no `any`/`console.log`/token-di-localStorage, anti-template (≥4 kualitas desain), build hijau. Temuan CRITICAL/HIGH wajib diperbaiki sebelum halaman dianggap selesai (D6/D7).

## F. URUTAN & ALOKASI (roster — Manifesto D8)
```
1. App shell + middleware + design tokens   → Opus(spec) + Sonet(impl)
2. Login                                     → Sonet
3. Dashboard                                 → Sonet
4. POS/Kasir                                 → Sonet     (kritikal UX)
5. Sales History + Void                      → Mipro
6. Inventory                                 → Mipro
7. Library (6 entitas)                        → Mipro
8. Settings                                   → Mipro
   Test komponen / docs / commit             → Haiku
   Data demo / i18n / struk text             → Miflash
   REVIEW + gate setiap halaman              → Captain Opus
```
Prinsip: **satu penulis filesystem per task**; Sonet pimpin frontend (kekuatannya), Mipro garap halaman data-berat, Opus pegang spec + gerbang. Mulai dari **App shell** (fondasi) sebelum halaman lain.

