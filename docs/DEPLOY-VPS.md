# Deploy ke VPS — Greenfield (deploy pertama) + GitHub Action

> Stack baru = 1 container `web` (Next.js: frontend + /api) di belakang Traefik.
> Deploy pertama = **bootstrap manual** sekali di VPS. Deploy berikutnya = **otomatis
> via GitHub Action** (`.github/workflows/deploy.yml`: push ke `main` → CI hijau →
> SSH ke VPS → `git pull origin main` → `docker compose -f docker-compose.prod.yml up -d --build`).

---

## 0. Prasyarat (siapkan dulu)
- VPS Linux dengan **Docker + Docker Compose** terpasang.
- **Domain** sudah diarahkan (A record) ke IP VPS (Traefik butuh ini untuk TLS Let's Encrypt).
- Akses **SSH** ke VPS.
- Repo: `https://github.com/nichopratama/Veloclad-POS`.

---

## 1. Naikkan kode ke branch `main` (deploy hanya jalan dari `main`)
Di mesin lokal:
```bash
git checkout master
git branch -f main master      # jadikan main = master terkini
git push -u origin main
```
> deploy.yml memicu deploy saat CI sukses di `main`. Untuk bootstrap pertama (manual)
> ini belum perlu jalan; tapi kode harus ada di `main` agar VPS bisa `git pull origin main`.

---

## 2. Bootstrap pertama di VPS (SSH — manual, sekali saja)
```bash
ssh USER@VPS_IP

# 2a. Clone repo ke lokasi yang dipakai deploy.yml
sudo mkdir -p /opt/antigravity-pos && sudo chown $USER /opt/antigravity-pos
git clone https://github.com/nichopratama/Veloclad-POS.git /opt/antigravity-pos
cd /opt/antigravity-pos
git checkout main
```

### 2b. Buat file `.env` (TIDAK ikut git — gitignored)
**Root `.env`** (dipakai Postgres + Traefik + samakan nama dengan local):
```env
DB_USER=pos_user
DB_PASSWORD=<PASSWORD-KUAT-BARU>     # rotate, jangan placeholder
DB_NAME=antigravity_pos
DOMAIN=pos.domain-anda.com
ACME_EMAIL=email-anda@domain.com
```

**`web/.env`** (dipakai container `web`):
```env
DATABASE_URL="postgresql://pos_user:<PASSWORD-SAMA-DGN-DB_PASSWORD>@postgres:5432/antigravity_pos?schema=tenant_vapescrew"
BETTER_AUTH_SECRET=<SECRET-KUAT-BARU-min-16-char>   # rotate
BETTER_AUTH_URL=https://pos.domain-anda.com          # origin HTTPS nyata
NODE_ENV=production
TENANT_NAME=vapescrew
```
> ⚠️ Gotcha: `DATABASE_URL` host = **`postgres`** (nama service di network), BUKAN `localhost`/`127.0.0.1`.

---

## 3. Restore DB (samakan dengan local)
Kirim dump dari local ke VPS, lalu restore:
```bash
# (di mesin LOCAL) salin dump ke VPS — file ada di scratchpad sesi:
scp antigravity_pos_dump.sql USER@VPS_IP:/opt/antigravity-pos/

# (di VPS) nyalakan HANYA postgres dulu, lalu restore
cd /opt/antigravity-pos
docker compose -f docker-compose.prod.yml up -d postgres
# tunggu sehat (~10 dtk), lalu:
docker exec -i pos-postgres-prod psql -U pos_user -d antigravity_pos < antigravity_pos_dump.sql
```
> Dump dibuat dengan `--clean --if-exists --no-owner` → idempoten & portabel.
> Setelah restore, hapus file dump dari VPS (berisi data): `rm antigravity_pos_dump.sql`.

---

## 4. Naikkan seluruh stack
```bash
cd /opt/antigravity-pos
docker compose -f docker-compose.prod.yml up -d --build
```
- Traefik otomatis ambil sertifikat TLS untuk `DOMAIN`.
- `web` aktif (Host→web:3000); `pos-frontend`/`pos-api` jalan idle (`traefik.enable=false`) = jaring rollback.

---

## 5. Verifikasi (smoke test produksi)
```bash
curl -sS https://DOMAIN/api/health           # {"status":"ok"}
curl -sS https://DOMAIN/api/health/ready      # {"status":"ready"}  ← Prisma + DB OK
```
Lalu di browser: login, POS checkout, sales, settings, dashboard.

---

## 6. Aktifkan deploy otomatis (GitHub Action) untuk SETERUSNYA
Di repo Veloclad-POS → **Settings → Secrets and variables → Actions → New repository secret**, tambah:
| Secret | Isi |
|--------|-----|
| `VPS_HOST` | IP / host VPS |
| `VPS_USER` | user SSH |
| `VPS_SSH_KEY` | private key SSH (yang public-nya ada di `~/.ssh/authorized_keys` VPS) |

Setelah itu: setiap `git push origin main` → CI jalan → jika hijau → deploy.yml SSH ke VPS,
`git pull origin main` + `docker compose -f docker-compose.prod.yml up -d --build` otomatis.

> Catatan: deploy.yml hanya `git pull` (bukan clone) & tak menyentuh `.env`/DB — itu sebab
> bootstrap pertama (§2–§4) harus manual.

---

## 7. Decommission app lama (NANTI, setelah yakin stabil — IREVERSIBEL)
Hanya setelah app baru terbukti stabil di produksi + DB sudah di-backup:
1. Hapus service `pos-frontend` & `pos-api` dari `docker-compose.yml` & `docker-compose.prod.yml`.
2. Hapus dir `frontend/` & `api/` (commit terpisah).
3. `docker image prune -f`.

**Rollback** (sebelum §7): di `docker-compose.prod.yml`, set `pos-web` `traefik.enable=false`
dan `pos-frontend` `traefik.enable=true`, lalu `up -d`. App lama melayani lagi.
