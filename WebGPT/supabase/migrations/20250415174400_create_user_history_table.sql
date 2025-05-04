-- Create user_history table
CREATE TABLE IF NOT EXISTS user_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prompt TEXT,
  html_content TEXT,
  css_content TEXT,
  js_content TEXT,
  image_data TEXT
);

-- Create index for faster user-specific queries
CREATE INDEX IF NOT EXISTS idx_user_history_user_id ON user_history(user_id);
