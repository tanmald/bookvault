ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS kanban_size TEXT NOT NULL DEFAULT 'small'
  CHECK (kanban_size IN ('small', 'large'));
