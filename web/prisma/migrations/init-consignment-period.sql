-- Consignment period (masa konsinyasi): suppliers grant a window before unsold
-- stock must be returned/pulled back. Term flows supplier-default -> PO -> lot:
--   suppliers.consignment_days       default term in days (override per PO)
--   purchase_orders.consignment_days term chosen for this PO (audit)
--   stock_lots.expires_at            received_at + term, set at receive time
-- NULL term/expires_at means "no fixed period" (legacy or open-ended).
-- Idempotent — safe to run per tenant / on fresh deploy.

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS consignment_days INTEGER;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS consignment_days INTEGER;

ALTER TABLE stock_lots
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Aging queries scan ACTIVE consignment lots by expiry; partial index keeps it lean.
CREATE INDEX IF NOT EXISTS idx_stock_lots_consignment_expiry
  ON stock_lots (expires_at)
  WHERE source_type = 'CONSIGNMENT' AND status = 'ACTIVE';
