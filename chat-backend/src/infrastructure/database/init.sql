-- Create database (run this manually as superuser)
-- CREATE DATABASE chat_db;

-- Connect to chat_db before running the following:

-- Drop existing tables if recreating schema (uncomment if needed)
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS chats CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TYPE IF EXISTS user_role CASCADE;
-- DROP TYPE IF EXISTS chat_status CASCADE;

-- User roles enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('client', 'agent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Chat status enum
DO $$ BEGIN
  CREATE TYPE chat_status AS ENUM ('pending', 'active', 'on_hold', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  whatsapp_id TEXT UNIQUE,
  password_hash TEXT,
  role user_role NOT NULL,
  is_online BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create chats table (represents a support conversation)
CREATE TABLE IF NOT EXISTS chats (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES users(id),
  agent_id INTEGER REFERENCES users(id),
  status chat_status DEFAULT 'pending',
  channel VARCHAR(20) NOT NULL DEFAULT 'web',
  subject VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_at TIMESTAMP,
  closed_at TIMESTAMP,
  first_response_at TIMESTAMP,
  rating INTEGER,
  feedback TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'sent',
  channel VARCHAR(20) NOT NULL DEFAULT 'web',
  external_message_id TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group chat tables
CREATE TABLE IF NOT EXISTS group_chats (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id INTEGER NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_by INTEGER REFERENCES users(id),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_messages (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add reply_to_id column if it doesn't exist (for existing databases)
DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Add columns for WhatsApp integration (safe for existing databases)
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_id TEXT UNIQUE;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE chats ADD COLUMN IF NOT EXISTS channel VARCHAR(20) NOT NULL DEFAULT 'web';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE chats ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE chats ADD COLUMN IF NOT EXISTS rating INTEGER;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE chats ADD COLUMN IF NOT EXISTS feedback TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel VARCHAR(20) NOT NULL DEFAULT 'web';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_message_id TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chats_client_id ON chats(client_id);
CREATE INDEX IF NOT EXISTS idx_chats_agent_id ON chats(agent_id);
CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(status);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_whatsapp_id ON users(whatsapp_id);
CREATE INDEX IF NOT EXISTS idx_chats_channel ON chats(channel);
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages(external_message_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);

-- Storage for chat attachments
CREATE TABLE IF NOT EXISTS storage_chat (
  id SERIAL PRIMARY KEY,
  entity_id INTEGER NOT NULL,
  entity_type VARCHAR(20) NOT NULL DEFAULT 'chat',
  url TEXT NOT NULL,
  public_id TEXT NOT NULL,
  resource_type VARCHAR(20) NOT NULL,
  is_attachment BOOLEAN NOT NULL DEFAULT false,
  mime_type VARCHAR(100),
  bytes INTEGER,
  filename TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_storage_chat_entity_id ON storage_chat(entity_id);
CREATE INDEX IF NOT EXISTS idx_storage_chat_entity_type_id ON storage_chat(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_storage_chat_public_id ON storage_chat(public_id);
CREATE INDEX IF NOT EXISTS idx_storage_chat_is_attachment ON storage_chat(is_attachment);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
-- Sample agents
INSERT INTO users (name, email, role, is_online) VALUES 
  ('Agent 1', 'agent1@support.com', 'agent', false),
  ('Agent 2', 'agent2@support.com', 'agent', false),
  ('Agent 3', 'agent3@support.com', 'agent', false)
ON CONFLICT (email) DO NOTHING;

-- Sample clients (will be created dynamically when they connect)
INSERT INTO users (name, role) VALUES 
  ('Client 1', 'client'),
  ('Client 2', 'client'),
  ('Client 3', 'client')
ON CONFLICT DO NOTHING;
