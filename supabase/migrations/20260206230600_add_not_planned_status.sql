-- Add 'not_planned' reading status before 'to_read'
-- This allows users to add books to their library without committing to read them yet

-- Add 'not_planned' to the reading_status enum
ALTER TYPE public.reading_status ADD VALUE IF NOT EXISTS 'not_planned';

-- Add documentation comment
COMMENT ON TYPE public.reading_status IS 'Reading status workflow: not_planned (not yet planned) -> to_read (planned but not started) -> reading (currently reading) -> read (finished)';

-- Note: We cannot set the default to 'not_planned' in the same transaction as adding the enum value
-- due to PostgreSQL limitations. The application handles the default value in useReadingProgress.ts
-- If you want to change the database default, run this command separately after the migration:
-- ALTER TABLE public.reading_progress ALTER COLUMN status SET DEFAULT 'not_planned';
