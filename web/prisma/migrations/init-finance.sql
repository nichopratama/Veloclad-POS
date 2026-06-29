-- Migration for Finance & Payables Tables
-- Executed manually or dynamically to ensure table exists in SaaS/pooled environment

CREATE TABLE IF NOT EXISTS payables (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'CREDIT_INVOICE', 'CONSIGNMENT_SETTLEMENT'
  total_debt DECIMAL(14,2) NOT NULL,
  amount_paid DECIMAL(14,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'PARTIAL', 'PAID'
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payable_payments (
  id SERIAL PRIMARY KEY,
  payable_id INTEGER NOT NULL REFERENCES payables(id) ON DELETE CASCADE,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  amount DECIMAL(14,2) NOT NULL,
  payment_method VARCHAR(50),
  reference_no VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  account_code VARCHAR(50),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  amount DECIMAL(14,2) NOT NULL,
  notes TEXT,
  expense_date DATE NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fix existing constraint if the table was previously created with SET NULL
ALTER TABLE expenses 
  DROP CONSTRAINT IF EXISTS expenses_created_by_fkey,
  ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
