-- Set 'not_planned' as the default status for new reading progress records
-- This must be done in a separate migration after the enum value is added

ALTER TABLE public.reading_progress
ALTER COLUMN status SET DEFAULT 'not_planned';
