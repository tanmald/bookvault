-- Add 'not_planned' reading status before 'to_read'
-- This allows users to add books to their library without committing to read them yet

-- Add 'not_planned' to the reading_status enum
ALTER TYPE public.reading_status ADD VALUE IF NOT EXISTS 'not_planned';

-- Update the default status for new reading progress records
ALTER TABLE public.reading_progress
ALTER COLUMN status SET DEFAULT 'not_planned';

-- Add documentation comment
COMMENT ON TYPE public.reading_status IS 'Reading status workflow: not_planned (not yet planned) -> to_read (planned but not started) -> reading (currently reading) -> read (finished)';
