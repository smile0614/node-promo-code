import { pool } from "./pool";

const initSql = `
CREATE TABLE IF NOT EXISTS promo_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  activation_limit INTEGER NOT NULL CHECK (activation_limit > 0),
  activation_count INTEGER NOT NULL DEFAULT 0 CHECK (activation_count >= 0),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activations (
  id BIGSERIAL PRIMARY KEY,
  promo_code_id BIGINT NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (promo_code_id, email)
);

CREATE INDEX IF NOT EXISTS idx_activations_promo_code_id ON activations(promo_code_id);
`;

async function init() {
  try {
    await pool.query(initSql);
    console.log("Database initialized.");
  } finally {
    await pool.end();
  }
}

void init();
