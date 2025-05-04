-- Add zip_file_path column to user_history table
ALTER TABLE user_history
ADD COLUMN IF NOT EXISTS zip_file_path TEXT;

-- Create bucket for history zip files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-history', 'user-history', false)
ON CONFLICT (id) DO NOTHING;
