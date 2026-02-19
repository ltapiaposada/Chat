-- Create global_messages table for team chat persistence
CREATE TABLE IF NOT EXISTS global_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_global_messages_created_at ON global_messages(created_at DESC);
