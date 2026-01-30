-- Add restrictive authentication policy for reading_progress table
-- This ensures anonymous users cannot access reading progress data

CREATE POLICY "Require authentication for reading_progress"
ON public.reading_progress
AS RESTRICTIVE
FOR SELECT
USING (auth.role() = 'authenticated');