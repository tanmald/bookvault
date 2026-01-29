-- Add RLS policy to allow users to view their friends' reading progress
CREATE POLICY "Users can view friends reading progress directly"
  ON reading_progress FOR SELECT
  USING (
    are_friends(auth.uid(), user_id)
  );