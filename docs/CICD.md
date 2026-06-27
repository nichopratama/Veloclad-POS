# Panduan CI/CD — Veloclad-POS

Pipeline **satu file** (`.github/workflows/pipeline.yml`), mengikuti pola
galangmerinservis: job `ci` → `secret-scan` → `deploy` (via `needs`), deploy hanya pada
push ke `main`. Untuk setup VPS pertama kali (greenfield) lihat [DEPLOY-VPS.md](./DEPLOY-VPS.md).

---

## 1. Alur besar

```
git push main ─> [GitHub Actions: pipeline.yml]
                    │
                    ├── job ci          (typecheck, build, audit)
                    ├── job secret-scan (gitleaks)
                    │        │ keduanya lulus  +  ref == main
                    │        v
                    └── job deploy ─ scp file ke VPS ─ ssh:
                          backup DB → tag :previous → compose up --build
                          → health-check → (gagal? rollback) → prune
                                    │
                                    v
                          Traefik (shared) ─https─> user
```

> Cukup `git push origin main`. CI + deploy jalan dalam **satu workflow**.

---

## 2. Komponen

| File | Peran |
|------|-------|
| `.github/workflows/pipeline.yml` | **Seluruh CI/CD** (ci + secret-scan + deploy) |
| `docker-compose.prod.yml` | Service prod (`web` + `postgres`), nempel Traefik bersama |
| `web/Dockerfile` | Build image Next.js standalone (multi-stage) |
| GitHub **Secrets** | `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` |

---

## 3. Trigger & branch

- `pipeline.yml` jalan pada **push & PR** ke `main` / `master`.
- Job **`deploy`** dijaga: `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`
  → **deploy HANYA saat push ke `main`** (push ke `master` / PR = hanya ci + secret-scan).

> Tak ada lagi keunikan `workflow_run`/default-branch (pendekatan lama 2-file). Semua satu
> workflow → cukup **push ke `main`** untuk deploy. `master` opsional (boleh dipakai untuk
> staging/verifikasi tanpa deploy).

---

## 4. Job-job

### `ci` — Build & Verify (dir `web`)
```
npm ci → npx prisma generate → npm run typecheck → npm run build → npm audit (non-blocking)
```
- **`npm run build` diberi placeholder env** (`DATABASE_URL`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`)
  karena `next build` mengevaluasi `src/lib/env.ts` (fail-fast) dan CI tak punya `.env`.
- `npm audit --audit-level=high || true` → **tak memblokir** (mengikuti galangmerin).

### `secret-scan` — gitleaks
```yaml
- uses: actions/checkout@v4
  with: { fetch-depth: 0 }   # scan SELURUH histori
- uses: gitleaks/gitleaks-action@v2
```
Merah bila ada kredensial ter-commit.

### `deploy` — ke produksi (`needs: [ci, secret-scan]`, hanya push `main`)
1. `appleboy/scp-action` — **copy file repo** (`source: "."`) ke `/opt/antigravity-pos`.
   (`.env`/`backups/` di VPS tak ter-overwrite karena tak ada di repo.)
2. `appleboy/ssh-action` — script di VPS:
   - cek `.env` & `web/.env` ada (gagal cepat bila tidak),
   - **backup DB** (`pg_dump` → `backups/`, simpan 10 terbaru),
   - **tag** `antigravity-pos-web:latest` → `:previous`,
   - `docker compose -f docker-compose.prod.yml up -d --build`,
   - **health-check** `/api/health/ready` 12× × 5 dtk,
   - **gagal → rollback** (`IMAGE_TAG=previous … up -d --no-build web`) + `exit 1`,
   - sehat → `docker image prune -f`.

> Rollback berfungsi karena compose memberi `web` tag: `image: antigravity-pos-web:${IMAGE_TAG:-latest}`.

---

## 5. Secrets & deploy key

Repo → **Settings → Secrets and variables → Actions**:

| Secret | Isi |
|--------|-----|
| `VPS_HOST` | IP VPS |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | **private** deploy key ed25519 **tanpa passphrase** |

Setup deploy key (sekali):
```bash
ssh-keygen -t ed25519 -f veloclad-pos-deploy -N "" -C "gha-deploy-veloclad-pos"
cat veloclad-pos-deploy.pub | ssh root@VPS_IP "cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
# VPS_SSH_KEY = isi file private 'veloclad-pos-deploy'
```
> ⚠️ Jangan hapus key di `authorized_keys` dengan pola luas (`sed /pattern/d`) — bisa
> menghapus deploy key app lain di VPS yang sama. Cocokkan **seluruh baris** key spesifik.

---

## 6. Deploy harian
```bash
git add -A && git commit -m "feat: ..."
git push origin main          # memicu pipeline penuh + deploy
```
Pantau tab **Actions** → job `ci`, `secret-scan`, `deploy` harus hijau.

---

## 7. Rollback
- **Otomatis**: health-check pasca-deploy gagal → balik ke image `:previous`, run ditandai gagal.
- **Manual** (VPS):
  ```bash
  cd /opt/antigravity-pos
  IMAGE_TAG=previous docker compose -f docker-compose.prod.yml up -d --no-build web
  ```
- **Revert kode**: `git revert <commit> && git push origin main`.
- Backup DB ada di `/opt/antigravity-pos/backups/`.

---

## 8. Troubleshooting (gotcha nyata)

| Gejala | Sebab | Solusi |
|--------|-------|--------|
| CI run **failure, 0 jobs** | YAML workflow tak valid | perbaiki YAML sebelum push |
| build gagal "Environment tidak valid" | `env.ts` fail-fast tanpa `.env` | placeholder env di step build (sudah ada) |
| Deploy **502 Bad Gateway** | Next bind ke `HOSTNAME=container-id` (1 interface) | `ENV HOSTNAME=0.0.0.0` di Dockerfile (sudah ada) |
| scp/ssh `unable to authenticate [none publickey]` | `VPS_SSH_KEY` salah / pubkey tak ada di VPS | samakan private key (secret) dgn pubkey di `authorized_keys` |
| Prisma engine gagal di Alpine | tak ada target musl | `binaryTargets=["native","linux-musl-openssl-3.0.x"]` (sudah ada) |
| `DATABASE_URL` tak konek | host `localhost` | host = **`postgres`** (service network) |
| Bentrok port 80/443 | Traefik kedua | jangan — nempel `traefik-public` (certresolver `letsencrypt`) |

---

## 9. Verifikasi sehat
```bash
curl -s https://DOMAIN/api/health         # {"status":"ok"}
curl -s https://DOMAIN/api/health/ready    # {"status":"ready"}
```

---

## 10. Perbedaan dgn galangmerinservis
Pola kini **selaras** (1 file, job `needs`, scp+ssh, backup/tag/health/rollback). Sisa beda:
- POS = **1 container `web`** (Next.js UI+API); galangmerin = `gms-frontend` + `gms-backend` terpisah.
- POS **punya gitleaks**; galangmerin baru ditambahkan juga.
- POS **belum punya job `test`**; galangmerin pakai Vitest. (TODO POS: tambah tes → masukkan ke `needs` deploy.)
