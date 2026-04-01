-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- conversations table
CREATE TABLE conversations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- messages table
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by conversation
CREATE INDEX messages_conversation_id_idx ON messages(conversation_id);

-- Auto-update conversations.updated_at whenever a new message is inserted
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_after_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_updated_at();

-- Enable Realtime on both tables
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- service_role bypasses RLS automatically — no explicit policy needed for it.
-- Authenticated users (dashboard) get read access.

CREATE POLICY "authenticated_read_conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_read_messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (true);
