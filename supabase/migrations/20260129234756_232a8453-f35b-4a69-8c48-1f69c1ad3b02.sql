-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a new policy that only allows authenticated users to view their own profile or profiles of friends
CREATE POLICY "Users can view own profile or friends profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR public.are_friends(auth.uid(), user_id)
);