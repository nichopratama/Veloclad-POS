-- Add cost_price to transaction_items to snapshot HPP
ALTER TABLE transaction_items 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(14,2) NOT NULL DEFAULT 0;
