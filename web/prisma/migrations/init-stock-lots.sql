-- Stock lot costing: track ownership (OWNED/CONSIGNMENT), cost, and remaining qty per batch.
-- Enables consignment-vs-owned depletion (owned-first), accurate per-sale COGS, and
-- automatic consignment debt from sold consignment units.
-- Idempotent — safe to run per tenant / on fresh deploy.

CREATE TABLE IF NOT EXISTS stock_lots (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  source_type VARCHAR(20) NOT NULL,               -- 'OWNED' | 'CONSIGNMENT'
  po_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  unit_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
  qty_received INTEGER NOT NULL,
  qty_remaining INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',   -- 'ACTIVE' | 'DEPLETED' | 'RETURNED'
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Depletion picks oldest ACTIVE lots first; owned-first ordering is applied in code.
CREATE INDEX IF NOT EXISTS idx_stock_lots_item_active ON stock_lots (item_id, status, received_at);

CREATE TABLE IF NOT EXISTS stock_lot_consumptions (
  id SERIAL PRIMARY KEY,
  transaction_item_id INTEGER NOT NULL REFERENCES transaction_items(id) ON DELETE CASCADE,
  stock_lot_id INTEGER NOT NULL REFERENCES stock_lots(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL,
  unit_cost DECIMAL(14,2) NOT NULL,
  settled BOOLEAN NOT NULL DEFAULT FALSE,         -- consignment: true once billed via settlement
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lot_consumptions_lot ON stock_lot_consumptions (stock_lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_consumptions_txitem ON stock_lot_consumptions (transaction_item_id);

-- Backfill: one OWNED baseline lot per item that currently has stock, valued at items.hpp.
INSERT INTO stock_lots (item_id, source_type, unit_cost, qty_received, qty_remaining, status, received_at)
SELECT i.id, 'OWNED', COALESCE(i.hpp, 0), i.stock, i.stock, 'ACTIVE', i.created_at
FROM items i
WHERE COALESCE(i.stock, 0) > 0
  AND NOT EXISTS (SELECT 1 FROM stock_lots sl WHERE sl.item_id = i.id);
