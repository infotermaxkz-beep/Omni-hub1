-- ═══════════════════════════════════════════════════════
--  OmniHub KZ — Supabase Schema
--  Запусти в Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════

-- Сотрудники B24 (авто-синхронизация)
CREATE TABLE IF NOT EXISTS b24_users (
  id         TEXT PRIMARY KEY,  -- B24 user ID
  name       TEXT NOT NULL,
  dept       TEXT,
  is_admin   BOOLEAN DEFAULT false,
  synced_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Диалоги
CREATE TABLE IF NOT EXISTS conversations (
  id                  BIGSERIAL PRIMARY KEY,
  channel             TEXT NOT NULL,    -- whatsapp | instagram | kaspi
  client_name         TEXT,
  client_id           TEXT,             -- phone / ig_id / kaspi_code
  client_phone        TEXT,
  last_message        TEXT,
  last_message_at     TIMESTAMPTZ DEFAULT NOW(),
  unread_count        INT DEFAULT 0,
  status              TEXT DEFAULT 'open',
  assigned_to         TEXT,
  kaspi_order_id      TEXT UNIQUE,
  kaspi_order_status  TEXT,
  kaspi_order_amount  DECIMAL,
  b24_lead_id         TEXT,
  b24_deal_id         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Сообщения
CREATE TABLE IF NOT EXISTS messages (
  id               BIGSERIAL PRIMARY KEY,
  conversation_id  BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  from_type        TEXT NOT NULL,   -- client | admin | system
  admin_id         TEXT,
  admin_name       TEXT,
  text             TEXT,
  files            JSONB DEFAULT '[]',
  sent_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Заказы Kaspi (детально)
CREATE TABLE IF NOT EXISTS kaspi_orders (
  id              TEXT PRIMARY KEY,
  conversation_id BIGINT REFERENCES conversations(id),
  status          TEXT,
  amount          DECIMAL,
  customer_name   TEXT,
  customer_phone  TEXT,
  items           JSONB DEFAULT '[]',
  kaspi_created   TIMESTAMPTZ,
  synced_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Цепочки задач B24
CREATE TABLE IF NOT EXISTS task_chains (
  id               BIGSERIAL PRIMARY KEY,
  conversation_id  BIGINT REFERENCES conversations(id),
  b24_task_ids     TEXT[],
  b24_lead_id      TEXT,
  created_by       TEXT,
  steps            JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_msgs_conv    ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conv_status  ON conversations(status);

-- Realtime подписки (живые обновления без перезагрузки)
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- RLS (через Service Key — полный доступ с сервера)
ALTER TABLE b24_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaspi_orders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_chains   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "omnihub_all" ON b24_users     FOR ALL USING (true);
CREATE POLICY "omnihub_all" ON conversations FOR ALL USING (true);
CREATE POLICY "omnihub_all" ON messages      FOR ALL USING (true);
CREATE POLICY "omnihub_all" ON kaspi_orders  FOR ALL USING (true);
CREATE POLICY "omnihub_all" ON task_chains   FOR ALL USING (true);
