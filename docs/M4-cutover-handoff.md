# M4 · Handoff Spec — **Cutover & Decommission** (Express/Vite → Next.js)

> Captain **Opus (C)** susun spec, pegang keputusan arsitektur + sekuens cutover + secret, dan **review+gate**.
> **Deputi Mipro (G)** implementasi IaC mekanis (Dockerfile, compose, CI) di window Gemini **setelah konfirmasi Master**.
> Acuan gaya: `docs/M3-handoff-frontend.md`. Satu penulis filesystem per tugas; diff balik ke C untuk gate sebelum commit.

---

## 0. Perubahan arsitektur (WAJIB paham dulu)

**Stack lama = 2 container aplikasi** di belakang Traefik:
- `pos-frontend` (Nginx serve Vite `dist`) → melayani `/`
- `pos-api` (Express, port 3004) → melayani `/api`
- Traefik prod: `Host(domain) && PathPrefix('/api')` → `pos-api:3004`; `Host(domain)` → `pos-frontend:80`

**Stack baru = 1 container aplikasi**:
- `web` (Next.js 15, port 3000) **melayani frontend DAN `/api/*` (Route Handlers) sekaligus**.
- ⇒ **Satu container `web` menggantikan KEDUA** `pos-frontend` + `pos-api`.
- Traefik prod baru: cukup **`Host(domain)` → `web:3000`** (aturan `PathPrefix('/api')` ke Express **dihapus** — Next menangani `/api` internal).

> Konsekuensi: jangan port nginx.conf lama. Tidak ada container nginx terpisah di stack baru.

---

## 1. Tugas C (prasyarat — dikerjakan Opus SEBELUM G mulai)

Ini menyentuh kode app/keamanan → tetap di C. G mengandalkan hasil ini.

1. **`web/next.config.mjs`**: tambah `output: 'standalone'` (image runner ramping; wajib untuk Dockerfile di §2).
2. **`web/prisma/schema.prisma`** generator: tambah `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` — **gotcha**: build di `node:20-alpine` = musl; tanpa target ini Prisma engine gagal saat runtime di container. Lalu `npm run db:generate` + commit `prisma generate` ulang.
3. **Env runtime** (didokumentasikan, nilai nyata via secret manager / `.env` server, JANGAN commit):
   - `DATABASE_URL` (silo: `...?schema=tenant_vapescrew`)
   - `BETTER_AUTH_SECRET` (**rotate** dari placeholder — D8 hardening)
   - `BETTER_AUTH_URL` = origin HTTPS nyata (mis. `https://pos.domain.com`) — **bukan** `localhost:3000`
   - `NODE_ENV=production`
4. **Rotate `DB_PASSWORD`** (Postgres) dari placeholder → secret baru; update `.env` server + DATABASE_URL.
5. Verifikasi `npm run build` hijau dengan `output: 'standalone'` aktif (gate C).

---

## 2. Tugas G-1 — `web/Dockerfile` (multi-stage, Next standalone + Prisma)

Buat `web/Dockerfile`. Pola wajib (jangan improvisasi urutan — Prisma+standalone rapuh):

```dockerfile
# ── deps ──────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── builder ───────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build           # next build (output: standalone)

# ── runner ────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S nextjs

# Next standalone output (server.js + traced node_modules)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Prisma: engine + generated client (standalone tracing kadang lewatkan engine)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

**Catatan G:**
- Jika `web/public/` ada, tambah `COPY --from=builder /app/public ./public`. (Saat ini cek dulu — bila tak ada, lewati.)
- `DATABASE_URL` **tidak diperlukan saat build** (Prisma generate & Next build halaman dinamis tak konek DB). Diperlukan **saat runtime** (via compose env).
- Jangan jalankan migrasi di `CMD` — schema tenant sudah ter-provision (additif M1/M2). Start = `node server.js` saja.

### G-1b — `web/.dockerignore`
```
node_modules
.next
.env*
npm-debug.log
.git
```

---

## 3. Tugas G-2 — Update `docker-compose.yml` (DEV, paralel/strangler)

Selama transisi, **biarkan** `pos-frontend`/`pos-api` lama jalan; **tambah** service `web` paralel agar bisa banding. Tambahkan:

```yaml
  # ── App BARU (Next.js: frontend + /api) ──────────────
  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    container_name: pos-web
    ports:
      - "${WEB_PORT:-3000}:3000"
    env_file: ./web/.env          # DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 30s
```

> Endpoint health sudah ada: `/api/health` (200) & `/api/health/ready` (DB-aware). Pakai `/api/health` untuk healthcheck.

---

## 4. Tugas G-3 — Update `docker-compose.prod.yml` (Traefik)

1. **Tambah** service `web` dengan label Traefik route root domain ke port 3000:
```yaml
  web:
    build:
      context: ./web
    container_name: pos-web-prod
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    env_file:
      - ./web/.env
    networks:
      - pos-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pos-web.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.pos-web.entrypoints=websecure"
      - "traefik.http.routers.pos-web.tls.certresolver=myresolver"
      - "traefik.http.services.pos-web.loadbalancer.server.port=3000"
      # Redirect HTTP→HTTPS
      - "traefik.http.routers.pos-web-http.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.pos-web-http.entrypoints=web"
      - "traefik.http.routers.pos-web-http.middlewares=redirect-to-https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
```
2. **Hapus** service `pos-frontend` & `pos-api` + label Traefik-nya **HANYA pada langkah decommission** (§6, owned C) — bukan sekarang. Untuk PR awal, `web` ditambah, dua label router lama dimatikan (`traefik.enable=false`) atau dibiarkan sampai sekuens cutover C.

> ⚠️ Konflik router: dua service tak boleh punya `Host(domain)` rule aktif bersamaan. Aktivasi `web` = nonaktif `pos-frontend` (langkah C, §6).

---

## 5. Tugas G-4 — Update CI `.github/workflows/ci.yml`

Ganti job `frontend` & `api` (stack lama) dengan satu job `web`. **Pertahankan** job `secret-scan` apa adanya. Jangan sentuh `deploy.yml` (tetap `compose -f docker-compose.prod.yml up -d --build`).

```yaml
  web:
    name: Web (Next.js) — typecheck, build, audit
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - run: npx prisma generate
      - run: npm run typecheck
      - run: npm run build
      - run: npm audit --audit-level=high
```

> Catatan: job `frontend`/`api` lama DIHAPUS di PR cutover (stack lama mau dimatikan). Bila Master mau transisi ekstra hati-hati, boleh sisakan sementara — keputusan C.

---

## 6. Sekuens cutover (OWNED **C/Opus** — bukan G; tiap langkah berisiko dikonfirmasi Master)

Dieksekusi setelah G-1..G-4 lulus gate & merged:

1. Build & up `web` **paralel** (lama tetap jalan): `docker compose up -d --build web`.
2. Smoke test `web` langsung (bypass Traefik / via host port): login, POS checkout, sales, settings, health/ready.
3. Set `BETTER_AUTH_URL` ke origin nyata + pastikan cookie domain/secure benar di belakang TLS.
4. **Flip Traefik**: aktifkan router `pos-web`, nonaktifkan `pos-frontend` (+ `pos-api`). Verifikasi `https://domain` dilayani Next, `/api/*` 200.
5. Pantau (log, error rate) — window observasi.
6. **Decommission** (ireversibel): hapus service `pos-frontend`/`pos-api` dari compose, hapus `frontend/` & `api/` dari repo, hapus image lama. Backup DB sebelum langkah ini.

**Rollback** (tiap langkah sebelum §6.6): balikkan label Traefik ke `pos-frontend`/`pos-api`; `web` dibiarkan idle. Karena DB dipakai bersama & perubahan additif, tak ada migrasi balik.

---

## 7. Definition of Done (gerbang Opus)

**G (per PR IaC):**
- [ ] `web/Dockerfile` build sukses lokal: `docker build -t pos-web ./web` → image jadi; `docker run` + env → `/api/health` 200, `/api/health/ready` 200 (DB-aware).
- [ ] `web/.dockerignore` ada.
- [ ] `docker-compose.yml` (dev): service `web` jalan paralel, healthcheck hijau, lama tak terganggu.
- [ ] `docker-compose.prod.yml`: service `web` + label Traefik benar; tak ada konflik `Host` rule aktif ganda.
- [ ] `ci.yml`: job `web` (typecheck+build+audit) hijau; `secret-scan` utuh; `deploy.yml` tak berubah.
- [ ] Tak ada secret ter-commit (gitleaks lulus).

**C (cutover):**
- [ ] Smoke test fungsional `web` lulus (login/POS/sales/settings).
- [ ] `BETTER_AUTH_URL` + cookie secure/HTTPS benar; secret di-rotate.
- [ ] Traefik flip tervalidasi; observasi bersih; decommission setelah backup.

---

## 8. Jebakan (gotcha nyata)
- **Prisma musl**: tanpa `binaryTargets` musl (§1.2) → runtime `PrismaClientInitializationError` di container. Wajib.
- **Standalone tak bawa Prisma engine**: copy `node_modules/.prisma` + `prisma/` eksplisit di runner (§2). Jangan andalkan tracing.
- **Satu container, dua peran**: jangan buat container nginx/`/api` terpisah. Next yang melayani `/api`.
- **Traefik `Host` ganda**: `web` & `pos-frontend` tak boleh aktif bareng di host rule sama → konflik routing. Aktivasi = bagian sekuens C.
- **`BETTER_AUTH_URL=localhost`**: bila tertinggal, cookie/redirect auth rusak di produksi. Set origin nyata.
- **Build perlu DB?** Tidak. Jangan inject DATABASE_URL nyata ke layer build image (hindari bocor ke layer); inject saat runtime via compose env.
- **Migrasi**: schema sudah ada (additif). Jangan `prisma migrate deploy`/`db push` di entrypoint — risiko ubah schema produksi.
```
