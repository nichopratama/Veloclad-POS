# Deploy ke VPS — Greenfield + Auto-deploy (GitHub Actions)

> Stack = **1 container `web`** (Next.js: frontend + `/api`) + **1 `postgres`**, **nempel ke
> Traefik yang SUDAH ADA** di VPS (shared reverse proxy). **JANGAN** jalankan Traefik kedua.
>
> - Deploy pertama (greenfield) = **bootstrap manual** sekali di VPS.
> - Deploy berikutnya = **otomatis**: `git push` ke `main` → CI hijau → `deploy.yml` SSH ke
>   VPS → `git pull origin main` → `docker compose -f docker-compose.prod.yml up -d --build`.

---

## 0. Arsitektur penting (paham dulu)
VPS sudah menjalankan **Traefik v3** (port 80/443) di network **`traefik-public`** untuk app
lain, dengan entrypoints `web`/`websecure` dan certresolver **`letsencrypt`**.
`docker-compose.prod.yml` kita **TIDAK** membawa Traefik sendiri — service `web`:
- join network **`traefik-public`** (external) agar Traefik bisa menemukannya,
- pakai label routing sesuai konvensi VPS (`certresolver=letsencrypt`, `Host(${DOMAIN})`),
- `postgres` di network privat `pos-internal` (tak terekspos).

> Tak ada app AntiGravity lama di VPS ini (greenfield), jadi tak ada decommission.

---

## 1. Prasyarat
- VPS Linux + **Docker & Docker Compose**, **Traefik bersama** sudah jalan di `traefik-public`
  dengan certresolver `letsencrypt` (cek: `docker network ls | grep traefik-public`).
- **Domain** (A record) sudah mengarah ke IP VPS.
- Akses **SSH** ke VPS (user `root`).
- Repo: `https://github.com/nichopratama/Veloclad-POS` (branch deploy = `main`).

---

## 2. Bootstrap pertama (manual, sekali — SSH ke VPS)

### 2a. Clone
```bash
mkdir -p /opt/antigravity-pos
git clone https://github.com/nichopratama/Veloclad-POS.git /opt/antigravity-pos
cd /opt/antigravity-pos && git checkout main
```

### 2b. Buat `.env` (TIDAK ikut git). Secret digenerate di VPS:
```bash
cd /opt/antigravity-pos
DBPW=$(openssl rand -hex 24)            # hex = URL-safe (aman di DATABASE_URL)
AUTHSEC=$(openssl rand -base64 32)
printf 'DB_USER=pos_user\nDB_PASSWORD=%s\nDB_NAME=antigravity_pos\nDOMAIN=%s\n' \
  "$DBPW" "pos.domain-anda.com" > .env
printf 'DATABASE_URL=postgresql://pos_user:%s@postgres:5432/antigravity_pos?schema=tenant_vapescrew\nBETTER_AUTH_SECRET=%s\nBETTER_AUTH_URL=https://%s\nNODE_ENV=production\nTENANT_NAME=vapescrew\n' \
  "$DBPW" "$AUTHSEC" "pos.domain-anda.com" > web/.env
chmod 600 .env web/.env
```
> ⚠️ `DATABASE_URL` host = **`postgres`** (nama service di network), BUKAN `localhost`/`127.0.0.1`.
> `BETTER_AUTH_URL` = origin HTTPS nyata. `${DOMAIN}` dipakai di label Traefik `web`.

### 2c. Restore DB (samakan dengan local)
Buat dump di **mesin local**, kirim ke VPS:
```bash
# (LOCAL) container DB local bernama pos-postgres
docker exec pos-postgres pg_dump -U pos_user -d antigravity_pos \
  --no-owner --no-privileges --clean --if-exists > antigravity_pos_dump.sql
scp antigravity_pos_dump.sql root@VPS_IP:/opt/antigravity-pos/
```
Lalu di **VPS**:
```bash
cd /opt/antigravity-pos
docker compose -f docker-compose.prod.yml up -d postgres      # nyalakan DB dulu
# tunggu healthy (~10 dtk), lalu restore:
docker exec -i pos-postgres-prod psql -U pos_user -d antigravity_pos < antigravity_pos_dump.sql
rm antigravity_pos_dump.sql                                    # hapus (berisi data)
```

### 2d. Build & nyalakan web
```bash
docker compose -f docker-compose.prod.yml up -d --build web
```

### 2e. Verifikasi
```bash
curl -s https://DOMAIN/api/health          # {"status":"ok"}
curl -s https://DOMAIN/api/health/ready     # {"status":"ready"}  ← Prisma + DB OK
```
Browser: login, POS checkout, sales, settings.

---

## 3. Aktifkan auto-deploy (GitHub Actions) — sekali
`deploy.yml` butuh SSH ke VPS. **Pakai deploy key KHUSUS CI tanpa passphrase** (jangan key
pribadi ber-passphrase — `appleboy/ssh-action` tak bisa mengetik passphrase).

1. Generate di local (passphrase kosong):
   ```bash
   ssh-keygen -t ed25519 -f veloclad-pos-deploy -N "" -C "gha-deploy-veloclad-pos"
   ```
2. Daftarkan **public** key ke VPS:
   ```bash
   cat veloclad-pos-deploy.pub | ssh root@VPS_IP "cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
   ```
3. Tambah **Secrets** di repo (Settings → Secrets and variables → Actions):
   | Name | Value |
   |------|-------|
   | `VPS_HOST` | IP VPS |
   | `VPS_USER` | `root` |
   | `VPS_SSH_KEY` | seluruh isi **private** key `veloclad-pos-deploy` (BEGIN…END) |
4. Hapus salinan private key lokal setelah masuk ke Secret.

---

## 4. Update berikutnya (rutin)
Cukup:
```bash
git push origin main
```
CI jalan → jika hijau → VPS otomatis `git pull` + rebuild + restart. Selesai.

---

## 5. Gotcha (yang pernah bikin gagal — sudah difix di repo)
- **Prisma musl**: `binaryTargets=["native","linux-musl-openssl-3.0.x"]` (Alpine). Sudah ada.
- **`next build` butuh env**: `env.ts` fail-fast → build error tanpa env. Dockerfile (stage
  builder) **dan** `ci.yml` (step build) memberi **placeholder env** (DATABASE_URL/
  BETTER_AUTH_SECRET/BETTER_AUTH_URL); nilai nyata hanya saat runtime.
- **502 Traefik**: Next standalone bind ke `process.env.HOSTNAME` (Docker set=container-id) →
  hanya 1 interface. Dockerfile runner set **`ENV HOSTNAME=0.0.0.0`** (wajib, app di 2 network).
- **DB host**: `DATABASE_URL` harus `@postgres:5432`, bukan `localhost`.
- **Traefik ganda**: jangan jalankan Traefik dari compose ini — pakai yang sudah ada.

---

## 6. Rollback
- Cepat: matikan app baru → `docker stop pos-web-prod` (route hilang dari Traefik). 
- Atau revert commit di `main` lalu `git push` (auto-deploy versi sebelumnya).
- DB additif & dipakai sendiri → tak ada migrasi balik.
