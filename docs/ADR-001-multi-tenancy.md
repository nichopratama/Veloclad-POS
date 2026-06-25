# ADR-001 — Model Multi-Tenancy AntiGravity POS

> **Status:** Proposed · **Tanggal:** 2026-06-25 · **Profil Nicho-Brain:** FULL
> **Konteks pemicu:** rencana dipakai sebagai SaaS (~10 customer awal).

## 1. Konteks

Saat ini aplikasi mengklaim "multi-tenant" lewat **schema-per-tenant** di PostgreSQL, tetapi schema dipilih dari **satu variabel env global**:

```js
const schemaName = process.env.DB_SCHEMA; // di-set sekali saat boot
```

Akibatnya **satu instance API hanya melayani satu tenant** (model *silo* de-facto), dan provisioning masih manual via `scripts/setup-tenant.js`. JWT membawa `tenantId` dari env, bukan dari identitas user.

Selain itu ada bug: `SET search_path` dijalankan pada instance Knex ber-**pool** tanpa pin koneksi → **risiko bocor lintas-tenant** jika dipaksa melayani banyak tenant per-request (lihat `GAP_ANALYSIS_AND_PLAN.md`).

Keputusan ini menentukan apakah kita **mempertahankan silo** (rapikan + otomasi) atau **pindah ke pooled** (refactor resolusi tenant per-request).

## 2. Opsi

### Opsi A — Silo (1 deployment per tenant) **[REKOMENDASI untuk ≤ ~20 tenant]**
Satu stack (api+frontend) per tenant; database boleh shared (schema terpisah) atau terisolasi.

- **Plus:** isolasi terkuat (blast radius 1 tenant); sudah sesuai kode saat ini → minim refactor; "noisy neighbor" mustahil; restore/backup per tenant sederhana; tak terdampak bug race (tiap proses 1 schema).
- **Minus:** biaya & operasional naik linear per tenant (N container); deploy/upgrade harus di-roll ke N stack; butuh orkestrasi + routing per subdomain; boros resource saat tenant idle.
- **Cocok saat:** jumlah tenant kecil–menengah, isolasi/compliance penting, tim kecil.

### Opsi B — Pooled (1 aplikasi melayani semua tenant)
Satu deployment; tenant di-resolve **per-request** (dari subdomain/JWT) → set schema pada koneksi yang benar.

- **Plus:** hemat resource & biaya pada skala besar; satu kali deploy untuk semua; cocok onboarding self-service massal.
- **Minus:** **wajib** memperbaiki bug tenant-isolation dulu (kalau tidak → kebocoran data); satu bug bisa kena semua tenant; "noisy neighbor"; backup/restore per tenant lebih rumit; butuh disiplin ketat tiap query.
- **Cocok saat:** target puluhan–ratusan+ tenant, harga per-seat tipis, self-service.

### Opsi C — Hybrid (pool untuk standar, silo untuk enterprise)
Mulai pooled; tenant besar/sensitif dipindah ke silo khusus. Fleksibel tapi paling kompleks — **ditunda** sampai ada kebutuhan nyata (YAGNI).

## 3. Keputusan

**Pilih Opsi A (Silo) untuk fase SaaS awal (~10 tenant), dengan otomasi**, dan siapkan jalur migrasi ke Opsi B bila tumbuh melewati ~20 tenant.

Alasan: pada 10 tenant, beban bukan masalah; nilai terbesar ada pada **isolasi data + minim refactor + cepat ke pasar**. Pooled menambah risiko keamanan (race) dan kompleksitas yang belum terbayar di skala ini.

### Yang harus dibangun agar Silo layak SaaS (bukan sekadar "jalan")
1. **Otomasi provisioning** — ubah `setup-tenant.js` menjadi alur ter-otomasi: buat schema → migrate → seed admin → daftarkan ke registry tenant → siapkan env/stack.
2. **Tenant registry** (control plane) — satu tabel/DB pusat berisi daftar tenant, status, subdomain, plan. Ini fondasi billing & super-admin (lihat FASE 6).
3. **Routing per tenant** — reverse-proxy (Nginx/Traefik) memetakan `tenant.app.com` → stack tenant.
4. **Deploy fan-out** — pipeline yang me-roll upgrade ke semua stack tenant + health-gate per tenant.
5. **Backup per tenant** + restore drill (D11).

### Pra-syarat tetap (berlaku untuk model apa pun)
- **Tetap perbaiki bug `SET search_path`** dengan helper `withTenant()` (`SET LOCAL` dalam transaksi) — supaya aman bila nanti ada proses yang menyentuh >1 schema (mis. job lintas-tenant, atau migrasi ke pooled). Ini sudah di FASE 0.

## 4. Jalur Migrasi Silo → Pooled (jika tumbuh > ~20 tenant)

1. Selesaikan helper `withTenant()` per-request (FASE 0) — ini juga prasyarat pooled.
2. Ganti `process.env.DB_SCHEMA` → resolusi tenant dari **subdomain/JWT** per request.
3. Pindahkan `tenantId` ke klaim JWT berbasis user login (bukan env).
4. Uji isolasi lintas-tenant (test khusus: user tenant A tak bisa baca data tenant B).
5. Konsolidasikan N stack → 1 deployment; registry tenant jadi sumber kebenaran.

## 5. Konsekuensi

- **Positif:** time-to-market cepat, isolasi kuat, risiko keamanan rendah untuk skala awal.
- **Negatif/utang:** otomasi provisioning & deploy fan-out harus dibangun (FASE 6); biaya per tenant lebih tinggi; perlu revisit ADR ini saat mendekati ~20 tenant.
- **Trigger review ADR:** jumlah tenant > 20, atau biaya infra per tenant jadi tak ekonomis, atau butuh onboarding self-service instan.
