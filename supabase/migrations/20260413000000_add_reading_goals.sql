-- Create reading_goals table for tracking annual reading targets

-- Ensure handle_updated_at function exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Create the reading_goals table
CREATE TABLE IF NOT EXISTS public.reading_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year integer NOT NULL,
  target integer NOT NULL CHECK (target >= 1 AND target <= 999),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, year)
);

-- Enable Row Level Security
ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;

-- Create index on user_id and year for efficient lookups
CREATE INDEX IF NOT EXISTS idx_reading_goals_user_id_year ON public.reading_goals(user_id, year);

-- RLS Policies
CREATE POLICY "Users can view own reading goals"
  ON public.reading_goals FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reading goals"
  ON public.reading_goals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reading goals"
  ON public.reading_goals FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reading goals"
  ON public.reading_goals FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Trigger to auto-update updated_at
CREATE TRIGGER handle_reading_goals_updated_at
  BEFORE UPDATE ON public.reading_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
