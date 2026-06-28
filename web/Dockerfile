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
# Placeholder env HANYA agar validasi fail-fast (src/lib/env.ts) lolos saat
# `next build` mengevaluasi route — di build tak ada .env (di-.dockerignore).
# Terkurung di stage builder (TIDAK diteruskan ke runner); nilai nyata diberikan
# saat runtime via compose env_file. Tak ada secret nyata di sini.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public" \
    BETTER_AUTH_SECRET="build_time_placeholder_secret_0123456789" \
    BETTER_AUTH_URL="http://localhost:3000"
RUN npm run build           # next build (output: standalone)

# ── runner ────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# WAJIB: Docker set HOSTNAME=container-id; Next standalone bind ke HOSTNAME →
# hanya 1 interface. Set 0.0.0.0 agar listen di semua network (Traefik bisa jangkau).
ENV HOSTNAME=0.0.0.0
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S nextjs

# Next standalone output (server.js + traced node_modules)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Prisma: engine + generated client (standalone tracing kadang lewatkan engine)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
