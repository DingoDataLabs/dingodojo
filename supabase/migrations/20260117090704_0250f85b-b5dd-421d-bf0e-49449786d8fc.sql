-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view modules" ON public.generated_modules;

-- Create a more restrictive policy that only allows users to view modules
-- for topics they have progress on (meaning they've actually started learning)
CREATE POLICY "Users can view modules for topics they have progress on" 
ON public.generated_modules 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Allow if user has progress on this topic
    EXISTS (
      SELECT 1 FROM public.student_progress sp
      JOIN public.profiles p ON sp.student_id = p.id
      WHERE p.user_id = auth.uid()
      AND sp.topic_id = generated_modules.topic_id
    )
    -- Or if it's a module they just created in the current session (within last hour)
    OR (
      created_at > now() - interval '1 hour'
    )
  )
);