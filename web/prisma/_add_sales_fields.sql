-- Migration prasyarat M2 modul sales (additif, non-destruktif).
-- 1) Diskon per item (FR-SALE-02 / FASE 2).
ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS discount NUMERIC(14,2) NOT NULL DEFAULT 0;

-- 2) Idempotency POST /transactions (D18) — cegah double-submit.
--    NULL-able + UNIQUE: baris lama (NULL) tetap valid; NULL dianggap distinct di Postgres.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS transactions_idempotency_key_unique ON transactions (idempotency_key);

