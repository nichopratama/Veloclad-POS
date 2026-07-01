-- Add external_ref to transactions for idempotent CSV import
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS external_ref VARCHAR(255) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_external_ref_unique
ON transactions (external_ref)
WHERE external_ref IS NOT NULL;
