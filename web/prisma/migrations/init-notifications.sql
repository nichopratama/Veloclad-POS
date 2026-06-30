-- Migration for Notifications (fan-out, per-user)
-- Executed manually or dynamically to ensure table exists (DB-first / pooled SaaS).
-- Idempotent: aman di-run ulang (CREATE TABLE / INDEX IF NOT EXISTS).
--
-- Desain: FAN-OUT — satu baris per user (auth_user_id → tabel "user" Better Auth),
-- bukan broadcast per-role. `is_read` jadi state baca PER-USER (tiap user punya
-- barisnya sendiri). Lihat web/src/lib/notifications.ts (broadcastNotification).

CREATE TABLE IF NOT EXISTS notifications (
  id           SERIAL PRIMARY KEY,
  auth_user_id TEXT          NOT NULL REFERENCES "user"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  title        VARCHAR(255)  NOT NULL,
  message      TEXT          NOT NULL,
  is_read      BOOLEAN       DEFAULT FALSE,
  category     VARCHAR(50)   NOT NULL,  -- 'SALES' | 'INVENTORY' | 'FINANCE' | 'SYSTEM'
  type         VARCHAR(50)   NOT NULL,  -- 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT'
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);

-- Query utama: WHERE auth_user_id = ? ORDER BY created_at DESC (GET /api/notifications)
CREATE INDEX IF NOT EXISTS notifications_auth_user_id_idx ON notifications (auth_user_id);
-- Filter unread badge.
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications (is_read);
