-- Create user_history table
CREATE TABLE IF NOT EXISTS public.user_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prompt TEXT,
  html_content TEXT,
  css_content TEXT,
  js_content TEXT,
  image_data TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_history_user_id ON public.user_history(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own history" 
ON public.user_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history"
ON public.user_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own history" 
ON public.user_history
FOR DELETE
USING (auth.uid() = user_id);
