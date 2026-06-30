SET search_path TO tenant_vapescrew;

-- Drop existing notifications table if it exists to cleanly re-create it according to the new schema
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  auth_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  category VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_auth_user_id_idx ON notifications(auth_user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);
