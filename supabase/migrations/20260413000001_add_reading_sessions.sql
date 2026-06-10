-- Create reading_sessions table for tracking daily reading time

CREATE TABLE IF NOT EXISTS public.reading_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_date ON public.reading_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_book_id ON public.reading_sessions(book_id);

-- RLS Policies
CREATE POLICY "Users can view own reading sessions"
  ON public.reading_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reading sessions"
  ON public.reading_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reading sessions"
  ON public.reading_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reading sessions"
  ON public.reading_sessions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Trigger to auto-update updated_at
CREATE TRIGGER handle_reading_sessions_updated_at
  BEFORE UPDATE ON public.reading_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
