-- ═══════════════════════════════════════════════════════
--  OmniHub KZ — Миграция 2
--  Запусти в Supabase SQL Editor → Run
-- ═══════════════════════════════════════════════════════

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel_account TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS funnel_stage TEXT DEFAULT 'Новый';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deal_amount DECIMAL;
ALTER TABLE task_chains   ADD COLUMN IF NOT EXISTS project_id TEXT;

CREATE INDEX IF NOT EXISTS idx_conv_funnel_stage ON conversations(funnel_stage);
