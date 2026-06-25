# 📋 Product Requirements Document (PRD)
## Sistem Point of Sale (POS) — AntiGravity POS

---

**Versi:** 1.2.0  
**Tanggal:** 7 Juni 2026  
**Author:** System Analyst — AntiGravity  
**Status:** Draft — Menunggu Review  
**Changelog:**
- v1.1 — Penambahan Docker sebagai platform deployment
- v1.2 — Multi-tenant PostgreSQL Schema Isolation, Backend API, port 3003  

---

## 1. 📌 Ringkasan Eksekutif

### 1.1 Latar Belakang
Bisnis ritel modern membutuhkan sistem pengelolaan transaksi yang terintegrasi, efisien, dan mudah digunakan. Sistem POS ini dirancang untuk memenuhi kebutuhan pengelolaan penjualan, stok, pembelian, dan laporan bisnis dalam satu platform terpadu berbasis web.

### 1.2 Tujuan Produk
Membangun aplikasi **Point of Sale (POS)** berbasis web yang mampu:
- Mengelola transaksi penjualan secara real-time
- Memantau stok barang dan melakukan pembelian ke supplier
- Menyediakan laporan bisnis yang komprehensif
- Mengelola master data (produk, pelanggan, supplier, promo)
- Mendukung pengaturan toko dan akun pengguna

### 1.3 Target Pengguna

| Peran | Deskripsi |
|-------|-----------|
| **Owner / Manager** | Memantau performa bisnis via dashboard, mengatur konfigurasi toko |
| **Kasir** | Melakukan transaksi penjualan sehari-hari |
| **Admin Gudang** | Mengelola stok, PO, dan penyesuaian inventori |
| **Admin Sistem** | Mengelola master data, setting toko, pajak, receipt |

### 1.4 Ruang Lingkup
Sistem ini mencakup **5 modul utama**:
1. Dashboard
2. Penjualan
3. Inventory
4. Library (Master Data)
5. Account Settings

---

## 2. 🎯 Tujuan & Sasaran Bisnis

| # | Sasaran | Metrik Keberhasilan |
|---|---------|-------------------|
| 1 | Mempercepat proses checkout | Waktu transaksi < 2 menit |
| 2 | Akurasi stok real-time | Selisih stok < 0.5% |
| 3 | Laporan otomatis harian | Laporan tersedia < 5 detik |
| 4 | Pengurangan human error | Error transaksi < 1% |
| 5 | Kemudahan pengelolaan data | Onboarding user < 1 jam |

---

## 3. 👤 User Stories

### 3.1 Modul Dashboard

```
US-001: Sebagai Owner, saya ingin melihat ringkasan penjualan hari ini 
        agar saya bisa memantau performa bisnis secara cepat.

US-002: Sebagai Manager, saya ingin melihat grafik tren penjualan 
        mingguan/bulanan agar bisa membuat keputusan strategis.

US-003: Sebagai Admin Gudang, saya ingin melihat alert stok menipis 
        agar bisa segera melakukan reorder.

US-004: Sebagai Owner, saya ingin melihat top 10 produk terlaris 
        agar bisa merencanakan stok dengan lebih baik.

US-005: Sebagai Manager, saya ingin melihat ringkasan pembelian ke supplier 
        agar bisa mengontrol pengeluaran operasional.
```

### 3.2 Modul Penjualan

```
US-010: Sebagai Kasir, saya ingin membuat transaksi baru dengan cepat 
        agar antrian pelanggan tidak menumpuk.

US-011: Sebagai Kasir, saya ingin mencari produk berdasarkan nama/kode/barcode 
        agar proses input item lebih cepat.

US-012: Sebagai Kasir, saya ingin memilih tipe pembayaran (tunai, kartu, transfer) 
        agar setiap transaksi tercatat dengan benar.

US-013: Sebagai Kasir, saya ingin menerapkan diskon/promo ke transaksi 
        agar harga yang diberikan ke pelanggan akurat.

US-014: Sebagai Kasir, saya ingin mencetak atau mengirim struk digital 
        agar pelanggan mendapat bukti transaksi.

US-015: Sebagai Manager, saya ingin melihat riwayat semua transaksi 
        agar bisa melakukan audit dan kontrol.

US-016: Sebagai Manager, saya ingin membatalkan atau refund transaksi 
        agar keluhan pelanggan bisa diselesaikan.
```

### 3.3 Modul Inventory

```
US-020: Sebagai Admin Gudang, saya ingin melihat summary stok semua item 
        agar bisa mengetahui kondisi gudang saat ini.

US-021: Sebagai Admin Gudang, saya ingin membuat Purchase Order (PO) ke supplier 
        agar proses pembelian terdokumentasi.

US-022: Sebagai Admin Gudang, saya ingin mengkonfirmasi penerimaan barang dari PO 
        agar stok otomatis bertambah sesuai barang yang diterima.

US-023: Sebagai Admin Gudang, saya ingin melakukan stock adjustment 
        agar stok di sistem sesuai dengan kondisi fisik gudang.

US-024: Sebagai Manager, saya ingin melihat histori pergerakan stok 
        agar bisa melacak masuk-keluarnya barang.
```

### 3.4 Modul Library

```
US-030: Sebagai Admin, saya ingin mengelola data produk (CRUD) 
        agar katalog produk selalu up-to-date.

US-031: Sebagai Admin, saya ingin membuat kategori produk 
        agar produk terorganisir dan mudah dicari.

US-032: Sebagai Admin, saya ingin membuat bundling produk 
        agar bisa menjual paket dengan harga khusus.

US-033: Sebagai Admin, saya ingin mengatur promo & diskon 
        agar strategi harga bisa dijalankan otomatis.

US-034: Sebagai Admin, saya ingin mengelola data pelanggan 
        agar hubungan dengan pelanggan tetap terjaga.

US-035: Sebagai Admin, saya ingin mengelola data supplier 
        agar proses pembelian barang berjalan lancar.

US-036: Sebagai Admin, saya ingin mengatur tipe pembayaran yang tersedia 
        agar kasir bisa memilih metode pembayaran yang tepat.
```

### 3.5 Modul Account Settings

```
US-040: Sebagai Owner, saya ingin mengatur profil akun saya 
        agar informasi pengguna selalu akurat.

US-041: Sebagai Owner, saya ingin mengatur informasi toko 
        agar data toko tampil dengan benar di struk dan laporan.

US-042: Sebagai Owner, saya ingin mengatur persentase pajak 
        agar perhitungan pajak di setiap transaksi akurat.

US-043: Sebagai Owner, saya ingin mengkustomisasi tampilan struk 
        agar receipt mencerminkan identitas brand toko.
```

---

## 4. 🏗️ Functional Requirements

### 4.1 Modul Dashboard

#### FR-DASH-01: Summary Cards
- Sistem HARUS menampilkan kartu ringkasan berisi:
  - Total Penjualan Hari Ini (Rp & jumlah transaksi)
  - Total Pembelian Bulan Ini
  - Total Item Stok Aktif
  - Keuntungan Kotor (Gross Profit) hari ini
  - Piutang Outstanding (jika ada)

#### FR-DASH-02: Grafik Penjualan
- Sistem HARUS menampilkan grafik tren penjualan dengan filter:
  - Harian (7 hari terakhir)
  - Mingguan (4 minggu terakhir)
  - Bulanan (12 bulan terakhir)
- Grafik HARUS menampilkan nilai penjualan dan jumlah transaksi

#### FR-DASH-03: Top Produk
- Sistem HARUS menampilkan 10 produk terlaris berdasarkan:
  - Jumlah unit terjual
  - Total nilai penjualan
- Filter periode: hari ini, minggu ini, bulan ini

#### FR-DASH-04: Notifikasi Stok
- Sistem HARUS menampilkan daftar produk yang stoknya di bawah minimum stock level
- Notifikasi HARUS muncul di dashboard dan dapat diklik ke halaman inventory

#### FR-DASH-05: Ringkasan Transaksi Terakhir
- Sistem HARUS menampilkan 5 transaksi penjualan terbaru

---

### 4.2 Modul Penjualan

#### FR-SALE-01: Transaksi Baru
- Sistem HARUS menyediakan tampilan kasir (POS Interface) dengan:
  - Panel pencarian produk (nama / kode / scan barcode simulasi)
  - Keranjang belanja dengan jumlah, harga satuan, subtotal
  - Tombol hapus item dari keranjang
  - Input diskon per item atau per transaksi
  - Dropdown pilih pelanggan (optional)
  - Dropdown pilih tipe pembayaran
  - Hitung kembalian otomatis (untuk tunai)
  - Tombol Proses / Bayar

#### FR-SALE-02: Penerapan Promo & Diskon
- Sistem HARUS otomatis menerapkan promo aktif jika syarat terpenuhi
- Kasir DAPAT menambah diskon manual (nilai/persentase)

#### FR-SALE-03: Riwayat Transaksi
- Sistem HARUS menampilkan daftar semua transaksi dengan filter:
  - Tanggal range
  - Status (selesai, batal, refund)
  - Kasir
  - Metode pembayaran
- Sistem HARUS mendukung pencarian berdasarkan nomor invoice

#### FR-SALE-04: Detail Transaksi
- Sistem HARUS menampilkan detail lengkap tiap transaksi
- Sistem HARUS mendukung cetak ulang struk

#### FR-SALE-05: Pembatalan & Refund
- Sistem HARUS memungkinkan pembatalan transaksi (dengan konfirmasi)
- Sistem HARUS otomatis mengembalikan stok jika transaksi dibatalkan/refund

---

### 4.3 Modul Inventory

#### FR-INV-01: Stock Summary
- Sistem HARUS menampilkan ringkasan stok dengan:
  - Total item aktif
  - Total nilai stok (HPP × qty)
  - Item di bawah minimum stock
  - Item tanpa stok (out of stock)
- Filter & pencarian berdasarkan nama, kategori, supplier

#### FR-INV-02: Supplier Management
- Sistem HARUS mendukung CRUD data supplier dari sini (mirror Library)
- Sistem HARUS menampilkan histori PO per supplier

#### FR-INV-03: Purchase Order (PO)
- Sistem HARUS memungkinkan pembuatan PO baru dengan:
  - Pilih supplier
  - Tambah item & qty yang dipesan
  - Tanggal PO & expected delivery
  - Catatan PO
- Status PO: Draft → Sent → Partial Received → Received → Cancelled
- Sistem HARUS mendukung penerimaan barang parsial
- Stok HARUS bertambah otomatis saat PO dikonfirmasi received

#### FR-INV-04: Stock Adjustment
- Sistem HARUS memungkinkan penyesuaian stok dengan alasan:
  - Barang rusak / expired
  - Koreksi stok fisik
  - Retur ke supplier
  - Opname
- Setiap adjustment HARUS tercatat dengan timestamp dan user yang melakukan

#### FR-INV-05: Histori Pergerakan Stok
- Sistem HARUS mencatat setiap mutasi stok (masuk/keluar)
- Filter berdasarkan item, tipe mutasi, tanggal

---

### 4.4 Modul Library

#### FR-LIB-01: Manajemen Pelanggan (Customer)
- CRUD data pelanggan: nama, telepon, email, alamat, poin loyalitas
- Histori transaksi per pelanggan
- Pencarian & filter pelanggan

#### FR-LIB-02: Manajemen Supplier
- CRUD data supplier: nama perusahaan, kontak, alamat, NPWP
- Status aktif/nonaktif

#### FR-LIB-03: Manajemen Produk (Items)
- CRUD produk dengan field:
  - Kode produk (auto-generate / manual)
  - Nama produk
  - Kategori
  - Satuan (pcs, kg, liter, dll)
  - Harga pokok (HPP)
  - Harga jual
  - Minimum stock
  - Supplier utama
  - Foto produk
  - Status aktif/nonaktif
- Bulk import via CSV (opsional)

#### FR-LIB-04: Kategori Produk
- CRUD kategori dengan nama & deskripsi
- Satu produk dapat memiliki satu kategori

#### FR-LIB-05: Bundling Produk
- Buat paket bundling dari beberapa produk
- Harga bundling bisa berbeda dari total harga satuan
- Bundling tampil sebagai item di kasir

#### FR-LIB-06: Promo
- Buat promo dengan tipe:
  - Diskon langsung (nilai/persentase)
  - Beli X Gratis Y
  - Minimal pembelian dapat diskon
- Periode aktif promo (tanggal mulai – selesai)
- Berlaku untuk: semua produk / kategori tertentu / produk tertentu

#### FR-LIB-07: Diskon
- Daftar diskon yang bisa diterapkan manual oleh kasir
- Tipe: persentase atau nilai tetap
- Batas maksimal diskon

#### FR-LIB-08: Tipe Pembayaran
- CRUD tipe pembayaran: Tunai, Kartu Debit, Kartu Kredit, QRIS, Transfer Bank, dll
- Aktif/nonaktif

---

### 4.5 Modul Account Settings

#### FR-SET-01: Profil Akun
- Edit nama, email, nomor HP, foto profil, ganti password

#### FR-SET-02: Pengaturan Toko
- Nama toko, alamat, nomor telepon toko, logo toko
- Timezone, mata uang

#### FR-SET-03: Pengaturan Pajak
- On/Off pajak
- Nama pajak (PPN, PPh, dll)
- Persentase pajak
- Pajak inklusif / eksklusif dari harga

#### FR-SET-04: Pengaturan Receipt / Struk
- Header struk (nama toko, alamat, telepon)
- Footer struk (pesan ucapan terima kasih, kebijakan retur)
- Show/hide kolom (pajak, diskon, poin)
- Preview struk langsung

---

## 5. ⚙️ Non-Functional Requirements

| Kategori | Requirement |
|---------|-------------|
| **Performa** | Halaman load < 2 detik, transaksi selesai < 1 detik |
| **Keandalan** | Uptime 99.5%, data tidak hilang saat refresh |
| **Keamanan** | Autentikasi login, role-based access control, schema isolation |
| **Usability** | Antarmuka responsif, navigasi intuitif, dark mode ready |
| **Skalabilitas** | Mendukung hingga 10.000 produk, 100.000 transaksi per tenant |
| **Kompatibilitas** | Chrome, Firefox, Edge (desktop browser) |
| **Persistensi Data** | PostgreSQL dengan schema per tenant (production) |
| **Deployment** | Berjalan dalam Docker Compose multi-service, portabel |
| **Multi-Tenancy** | Setiap bisnis memiliki schema PostgreSQL terisolasi |
| **Portabilitas** | Setup tenant baru cukup dengan file `.env` + `docker compose up` |

---

## 6. 🗄️ Data Model (Entity Relationship)

### Entitas Utama

```
┌─────────────────────────────────────────────────────────────────┐
│                        ENTITIES                                  │
├──────────────┬──────────────────────────────────────────────────┤
│ Entity       │ Attributes                                       │
├──────────────┼──────────────────────────────────────────────────┤
│ User         │ id, name, email, password, role, phone, avatar   │
│ Store        │ id, name, address, phone, logo, currency, tz     │
│ TaxSetting   │ id, name, rate, is_inclusive, is_active          │
│ Receipt      │ id, header, footer, show_tax, show_discount      │
├──────────────┼──────────────────────────────────────────────────┤
│ Category     │ id, name, description                            │
│ Item         │ id, code, name, category_id, unit, hpp, price,   │
│              │ min_stock, supplier_id, image, is_active          │
│ BundleItem   │ id, name, price, items: [{item_id, qty}]         │
│ Customer     │ id, name, phone, email, address, points          │
│ Supplier     │ id, name, contact, phone, email, address, npwp   │
│ PaymentType  │ id, name, type, is_active                        │
│ Promo        │ id, name, type, value, min_purchase, start, end, │
│              │ applicable_to, item_ids, category_ids            │
│ Discount     │ id, name, type, value, max_value, is_active      │
├──────────────┼──────────────────────────────────────────────────┤
│ Transaction  │ id, invoice_no, date, customer_id, cashier_id,   │
│              │ payment_type_id, subtotal, discount, tax, total,  │
│              │ paid, change, status, notes                       │
│ TrxItem      │ id, transaction_id, item_id, qty, price,         │
│              │ discount, subtotal                                │
├──────────────┼──────────────────────────────────────────────────┤
│ PurchaseOrder│ id, po_number, supplier_id, date, expected_date, │
│              │ status, notes, total                              │
│ POItem       │ id, po_id, item_id, qty_order, qty_received,     │
│              │ hpp, subtotal                                     │
│ StockMovement│ id, item_id, type, qty, reference_id, note,      │
│              │ created_by, created_at                            │
│ StockAdjust  │ id, item_id, qty_before, qty_after, reason,      │
│              │ note, created_by, created_at                      │
└──────────────┴──────────────────────────────────────────────────┘
```

---

## 7. 🔄 User Flow Utama

### 7.1 Flow Transaksi Penjualan
```
Kasir Login → Buka Menu Penjualan → Klik "Transaksi Baru"
→ Cari & Tambah Produk ke Keranjang
→ [Opsional] Pilih Pelanggan
→ [Opsional] Terapkan Diskon / Promo
→ Pilih Metode Pembayaran
→ Input Nominal Bayar (jika tunai)
→ Klik "Proses Pembayaran"
→ Tampilkan Struk → Cetak / Kirim
→ Stok otomatis berkurang → Transaksi tercatat
```

### 7.2 Flow Purchase Order
```
Admin Gudang → Inventory → Purchase Order → Buat PO Baru
→ Pilih Supplier → Tambah Item & Qty
→ Simpan sebagai Draft → Konfirmasi Kirim PO
→ Barang Tiba → Konfirmasi Penerimaan (partial/full)
→ Stok otomatis bertambah → PO status: Received
```

### 7.3 Flow Stock Adjustment
```
Admin Gudang → Inventory → Stock Adjustment → Buat Baru
→ Pilih Item → Input Qty Aktual / Selisih
→ Pilih Alasan → Tambah Catatan
→ Simpan → Stok terkoreksi → Tercatat di histori
```

---

## 8. 🏛️ Arsitektur Teknis

### 8.1 Tech Stack

#### 🖥️ Frontend
| Layer | Teknologi | Versi |
|-------|-----------|-------|
| **Framework** | React | 18.x |
| **Build Tool** | Vite | 5.x |
| **Styling** | Vanilla CSS (Custom Design System) | — |
| **Routing** | React Router | v6 |
| **State Management** | React Context API + useReducer | — |
| **Charting** | Recharts | 2.x |
| **Icons** | Lucide React | latest |
| **HTTP Client** | Axios | 1.x |

#### 🔧 Backend API
| Layer | Teknologi | Versi |
|-------|-----------|-------|
| **Runtime** | Node.js | 20.x LTS |
| **Framework** | Express.js | 4.x |
| **ORM / Query Builder** | Knex.js | 3.x |
| **DB Driver** | node-postgres (pg) | 8.x |
| **Validasi** | Zod | 3.x |
| **Auth** | JWT (jsonwebtoken) | 9.x |
| **Migration** | Knex Migrations | — |
| **Tenant Provisioning** | Custom setup script (Node.js) | — |

#### 🗄️ Database
| Layer | Teknologi | Versi |
|-------|-----------|-------|
| **Database** | PostgreSQL | 16.x |
| **Strategy** | Schema-per-Tenant (Multi-tenant Isolation) | — |
| **Schema Naming** | `tenant_{TENANT_ID}` | e.g. `tenant_tokoabc` |
| **Shared Schema** | `public` (global config, tenant registry) | — |

#### 🐳 Containerization & Deployment
| Layer | Teknologi | Keterangan |
|-------|-----------|------------|
| **Container Runtime** | Docker Engine | 24.x+ |
| **Orchestration** | Docker Compose | v2 |
| **Web Server (FE)** | Nginx | Alpine (1.25) |
| **Build Strategy** | Multi-stage Dockerfile | Build → Serve |
| **Port Frontend** | Host `3003` → Container `80` | Fixed |
| **Port API** | Host `3004` → Container `3004` | Internal |
| **Port DB** | Host `5432` → Container `5432` | Internal |
| **Environment Config** | `.env` file per tenant | Setup awal wajib |

---

### 8.2 Strategi Multi-Tenant: PostgreSQL Schema Isolation

> [!IMPORTANT]
> Setiap pemilik bisnis yang menjalankan sistem ini mendapatkan **schema PostgreSQL terpisah**.
> Isolasi penuh: data antar tenant tidak pernah bercampur.

#### Konsep Schema Isolation

```
PostgreSQL Database: antigravity_pos
│
├── Schema: public              ← Shared: tenant registry, global config
│   └── Table: tenants
│
├── Schema: tenant_tokoabc      ← Tenant A: Toko ABC
│   ├── Table: items
│   ├── Table: transactions
│   ├── Table: customers
│   └── ... (semua tabel bisnis)
│
├── Schema: tenant_warungbudi   ← Tenant B: Warung Budi
│   ├── Table: items
│   ├── Table: transactions
│   └── ...
│
└── Schema: tenant_tokomodern   ← Tenant C: Toko Modern
    └── ...
```

#### Mekanisme Isolasi
- Backend API membaca `TENANT_SCHEMA` dari environment variable
- Setiap query menggunakan `SET search_path = tenant_{id}` secara otomatis
- Tidak ada query lintas schema
- Setiap tenant punya credentials DB terpisah (optional: shared DB user)

---

### 8.3 Setup Variable (`.env` per Tenant)

File `.env` adalah **konfigurasi wajib** yang harus diisi sebelum `docker compose up`.
Setiap tenant (pemilik bisnis) memiliki file `.env` sendiri:

```bash
# ============================================================
# .env — Konfigurasi Tenant AntiGravity POS
# Salin dari .env.example — ISI sebelum menjalankan sistem
# ============================================================

# ── TENANT IDENTITY ─────────────────────────────────────────
TENANT_ID=tokoabc               # Huruf kecil, tanpa spasi (ID unik bisnis)
TENANT_NAME=Toko ABC             # Nama bisnis (tampil di UI & struk)
TENANT_SLUG=tokoabc              # Slug URL-friendly

# ── DATABASE ────────────────────────────────────────────────
DB_HOST=postgres                 # Nama service di docker-compose
DB_PORT=5432
DB_NAME=antigravity_pos          # Nama database (shared)
DB_USER=pos_user
DB_PASSWORD=ganti_dengan_password_aman
DB_SCHEMA=tenant_tokoabc         # Schema PostgreSQL khusus tenant ini
                                 # Format: tenant_{TENANT_ID}

# ── APPLICATION ─────────────────────────────────────────────
NODE_ENV=production
API_PORT=3004
JWT_SECRET=ganti_dengan_secret_panjang_dan_acak
JWT_EXPIRES_IN=8h

# ── STORE DEFAULT SETTINGS ──────────────────────────────────
STORE_CURRENCY=IDR               # IDR / USD / SGD
STORE_TIMEZONE=Asia/Jakarta      # Timezone toko
STORE_TAX_RATE=11                # PPN default (%)
STORE_TAX_INCLUSIVE=false        # true = harga sudah termasuk pajak

# ── DOCKER PORT ─────────────────────────────────────────────
FRONTEND_PORT=3003               # Port akses browser → http://localhost:3003
```

---

### 8.4 Tenant Provisioning Flow

Alur setup **pertama kali** untuk pemilik bisnis baru:

```
1. Copy .env.example → .env
2. Isi semua variable di .env
   └── Terutama: TENANT_ID, DB_PASSWORD, JWT_SECRET
3. docker compose up -d
   └── PostgreSQL container start
   └── API container start → jalankan setup-tenant.js
       └── Buat schema: CREATE SCHEMA tenant_{TENANT_ID}
       └── Jalankan migrations pada schema baru
       └── Insert data awal (seed): payment types, default category
       └── Daftarkan tenant ke tabel public.tenants
4. Akses: http://localhost:3003
5. Login dengan akun owner default
   └── Email: admin@{TENANT_SLUG}.local
   └── Password: Admin123! (wajib ganti)
```

---

### 8.5 Arsitektur Deployment Docker (Multi-Service)

```
┌───────────────────────────────────────────────────────────┐
│                    HOST MACHINE                           │
│                                                           │
│   Browser → http://localhost:3003                         │
│                     │                                    │
│      ┌─────────────▼─────────────┐                     │
│      │  pos-frontend : 3003  │                     │
│      │  Nginx (React Build)  │                     │
│      └─────────────┬─────────────┘                     │
│                   │ /api/* proxy                        │
│      ┌─────────────▼─────────────┐                     │
│      │  pos-api : 3004       │                     │
│      │  Node.js + Express    │                     │
│      │  Knex.js (ORM)        │                     │
│      │  SET search_path=     │                     │
│      │    tenant_{ID}        │                     │
│      └─────────────┬─────────────┘                     │
│                   │ SQL queries                         │
│      ┌─────────────▼─────────────┐                     │
│      │  postgres : 5432      │                     │
│      │  PostgreSQL 16        │                     │
│      │  ┌─────────────────┐  │                     │
│      │  │ Schema: public   │  │                     │
│      │  │ Schema: tenant_X │  │                     │
│      │  └─────────────────┘  │                     │
│      └───────────────────────────┘                     │
│            💾 postgres-data (volume)                   │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

### 8.6 Multi-Stage Dockerfile Frontend

```dockerfile
# ── Stage 1: Build ──────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────
FROM nginx:1.25-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 8.7 Dockerfile Backend API

```dockerfile
# api/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
# Jalankan tenant provisioning lalu start API
CMD ["sh", "-c", "node scripts/setup-tenant.js && node src/index.js"]
EXPOSE 3004
```

---

### 8.8 Docker Compose (Multi-Service)

```yaml
# docker-compose.yml
name: antigravity-pos

services:

  # ── Frontend (React + Nginx) ───────────────────────
  pos-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: pos-frontend
    ports:
      - "${FRONTEND_PORT:-3003}:80"
    depends_on:
      pos-api:
        condition: service_healthy
    restart: unless-stopped

  # ── Backend API (Node.js + Express) ───────────────
  pos-api:
    build:
      context: ./api
      dockerfile: Dockerfile
    container_name: pos-api
    ports:
      - "${API_PORT:-3004}:3004"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3004/health"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 30s

  # ── Database (PostgreSQL) ─────────────────────────
  postgres:
    image: postgres:16-alpine
    container_name: pos-postgres
    environment:
      POSTGRES_DB: ${DB_NAME:-antigravity_pos}
      POSTGRES_USER: ${DB_USER:-pos_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-pos_user} -d ${DB_NAME:-antigravity_pos}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:   # Data PostgreSQL persisten
```

---

### 8.9 Nginx Configuration (dengan API Proxy)

```nginx
# nginx.conf — SPA routing + API reverse proxy
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json
               application/javascript text/xml;

    # Proxy request /api/* ke backend
    location /api/ {
        proxy_pass         http://pos-api:3004/;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|svg|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

### 8.10 Struktur Folder (Full Stack + Docker)

```
pos/                                   # Root project
├── 🐳 docker-compose.yml            # Multi-service orchestration
├── 🐳 .env.example                  # Template konfigurasi tenant
├── 🐳 .env                          # Konfigurasi aktif (jangan di-commit!)
├── 🐳 .gitignore
├── README.md
│
├── frontend/                          # React + Vite App
│   ├── 🐳 Dockerfile
│   ├── 🐳 .dockerignore
│   ├── 🐳 nginx.conf
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/       # Button, Input, Modal, Card, Table
│   │   │   ├── layout/       # Sidebar, Header, PageLayout
│   │   │   └── charts/       # SalesChart, StockChart
│   │   ├── pages/
│   │   │   ├── Dashboard/
│   │   │   ├── Sales/
│   │   │   ├── Inventory/
│   │   │   ├── Library/
│   │   │   └── Settings/
│   │   ├── context/          # AppContext, AuthContext
│   │   ├── hooks/            # useApi, useAuth, usePOS
│   │   ├── utils/            # formatCurrency, generateInvoice
│   │   ├── styles/           # Global CSS, variables
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── router.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── api/                               # Node.js + Express API
    ├── 🐳 Dockerfile
    ├── 🐳 .dockerignore
    ├── package.json
    ├── scripts/
    │   └── setup-tenant.js    # Provisioning: buat schema + migrate + seed
    ├── migrations/            # Knex migration files per tabel
    ├── seeds/                 # Data awal: payment types, kategori default
    └── src/
        ├── index.js           # Entry point Express
        ├── db.js              # Knex connection + set search_path
        ├── middleware/
        │   ├── auth.js        # JWT verification
        │   └── tenant.js      # Set DB search_path per request
        └── routes/
            ├── auth.js
            ├── dashboard.js
            ├── sales.js
            ├── inventory.js
            ├── library.js
            └── settings.js
```

---

### 8.11 Perintah Docker

```bash
# 1. Setup pertama kali
cp .env.example .env
# Edit .env sesuai konfigurasi tenant Anda

# 2. Build & jalankan semua service
docker compose up --build -d

# 3. Akses aplikasi
# → http://localhost:3003

# 4. Hentikan
docker compose down

# 5. Hentikan + hapus data (HATI-HATI!)
docker compose down -v

# 6. Lihat log per service
docker compose logs -f pos-api
docker compose logs -f pos-frontend
docker compose logs -f postgres

# 7. Rebuild setelah perubahan kode
docker compose up --build -d pos-api
docker compose up --build -d pos-frontend

# 8. Masuk ke shell database
docker compose exec postgres psql -U pos_user -d antigravity_pos
```

---

### 8.12 Komponen Navigasi

```
Sidebar Navigation:
├── 📊 Dashboard
├── 🛒 Penjualan
│   ├── Transaksi Baru
│   └── Riwayat Transaksi
├── 📦 Inventory
│   ├── Ringkasan Stok
│   ├── Supplier
│   ├── Purchase Order
│   └── Stock Adjustment
├── 📚 Library
│   ├── Pelanggan
│   ├── Supplier
│   ├── Produk
│   ├── Kategori
│   ├── Bundling
│   ├── Promo
│   ├── Diskon
│   └── Tipe Pembayaran
└── ⚙️ Pengaturan
    ├── Profil Akun
    ├── Toko
    ├── Pajak
    └── Receipt
```

---

## 9. 🎨 Design System

### 9.1 Color Palette
| Token | Nilai | Penggunaan |
|-------|-------|-----------|
| `--primary` | `#6C63FF` | Aksi utama, highlight |
| `--primary-dark` | `#5A52D5` | Hover state |
| `--secondary` | `#00BFA5` | Success, konfirmasi |
| `--danger` | `#FF5252` | Error, hapus, batal |
| `--warning` | `#FFB74D` | Peringatan, stok rendah |
| `--bg-dark` | `#0F1117` | Background utama |
| `--bg-card` | `#1A1D27` | Card background |
| `--bg-surface` | `#22263A` | Surface / input |
| `--text-primary` | `#FFFFFF` | Teks utama |
| `--text-secondary` | `#9CA3AF` | Teks sekunder |
| `--border` | `#2D3250` | Border elemen |

### 9.2 Typography
- **Font**: Inter (Google Fonts)
- **Heading**: 24px–36px, weight 700
- **Subheading**: 16px–20px, weight 600
- **Body**: 14px, weight 400
- **Caption**: 12px, weight 400

### 9.3 Design Principles
- **Dark Mode** sebagai tampilan default (premium feel)
- **Glassmorphism** pada card dan modal
- **Micro-animation** pada hover dan transisi halaman
- **Konsisten**: spacing 4px grid, border-radius 8px–16px

---

## 10. 📊 Fase Pengembangan (Roadmap)

### Phase 1 — Foundation (Sprint 1–2)
- [ ] Setup monorepo: `frontend/` + `api/` + docker-compose.yml
- [ ] Setup PostgreSQL schema + Knex migrations
- [ ] Tenant provisioning script (`setup-tenant.js`)
- [ ] Backend API: auth, store settings endpoints
- [ ] Frontend: layout, sidebar, design system

### Phase 2 — Core Modules (Sprint 3–5)
- [ ] Modul Library: Items, Category, Customer, Supplier, Payment Type
- [ ] Modul Penjualan: POS Interface + Transaksi (via API)
- [ ] Modul Dashboard: Summary cards + Grafik
- [ ] Modul Inventory: Stock Summary, PO, Adjustment
- [ ] Modul Account Settings

### Phase 3 — Enhancement (Sprint 6+)
- [ ] Promo & Diskon otomatis
- [ ] Bundling produk
- [ ] Export laporan (PDF/CSV)
- [ ] Multi-user & role management
- [ ] Barcode scanner support
- [ ] CI/CD pipeline + Docker registry

---

## 11. ✅ Kriteria Penerimaan (Acceptance Criteria)

| Modul | Kriteria |
|-------|----------|
| **Dashboard** | Summary cards tampil benar, grafik update real-time, alert stok muncul |
| **Penjualan** | Transaksi selesai dalam 3 langkah, stok berkurang otomatis, struk bisa dicetak |
| **Inventory** | PO bisa dibuat & diterima, stok update otomatis, adjustment tercatat |
| **Library** | Semua CRUD berjalan, data tersimpan, pencarian & filter berfungsi |
| **Settings** | Perubahan tersimpan & langsung berlaku di seluruh aplikasi |

---

## 12. ❓ Open Questions & Keputusan Desain

> [!IMPORTANT]
> Item berikut membutuhkan konfirmasi sebelum implementasi dimulai:

| # | Pertanyaan | Default yang Diusulkan |
|---|-----------|----------------------|
| 1 | Apakah perlu fitur multi-user / login per tenant? | Ya — JWT auth (owner + kasir) |
| 2 | Apakah perlu export laporan ke PDF? | Phase 3 |
| 3 | Apakah ada integrasi printer struk fisik? | Tidak (cetak browser) |
| 4 | Apakah perlu fitur hutang / kredit pelanggan? | Tidak (MVP) |
| 5 | Apakah bahasa UI: Indonesia atau Inggris? | Indonesia |
| 6 | Apakah perlu barcode scanner? | Simulasi keyboard input |
| 7 | Port frontend Docker? | `3003` (host) → `80` (container) ✔️ |
| 8 | Port API Docker? | `3004` (host) → `3004` (container) ✔️ |
| 9 | Apakah satu PostgreSQL instance untuk semua tenant? | Ya — schema isolation |
| 10 | Bagaimana cara deploy tenant baru? | Copy `.env` + `docker compose up` |
| 11 | Apakah Docker Compose berjalan di server yang sama? | Ya (single host) |
| 12 | Apakah perlu Docker registry / CI-CD pipeline? | Tidak (MVP local/server deploy) |

---

*Dokumen ini adalah living document dan akan diperbarui seiring perkembangan proyek.*

---
**AntiGravity POS System** | PRD v1.2 | System Analyst Team
