# AntiGravity POS System

Sistem Point of Sale (POS) Multi-Tenant menggunakan arsitektur Docker Compose.

## 🚀 Setup & Installation

1. Copy file `.env.example` menjadi `.env`
   ```bash
   cp .env.example .env
   ```
2. Isi variable dalam `.env` sesuai kebutuhan tenant (password, dll)
3. Jalankan Docker Compose:
   ```bash
   docker compose up --build -d
   ```
4. Akses sistem melalui browser:
   - Frontend: `http://localhost:3003`
   - API Healthcheck: `http://localhost:3004/health`

## 📁 Struktur Monorepo

- `frontend/` — Aplikasi kasir/dashboard menggunakan React + Vite
- `api/` — Backend API server menggunakan Node.js, Express, dan Knex.js
- `docker-compose.yml` — Orkestrasi database (PostgreSQL), api, dan frontend

## ⚙️ Tech Stack
- React 18
- Node.js 20 (Express)
- PostgreSQL (Schema per Tenant)
