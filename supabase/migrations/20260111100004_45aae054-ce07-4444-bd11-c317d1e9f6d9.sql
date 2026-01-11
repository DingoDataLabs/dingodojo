-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view generated modules" ON public.generated_modules;

-- Create a new policy that only allows authenticated users to view modules
CREATE POLICY "Authenticated users can view modules" 
ON public.generated_modules 
FOR SELECT 
TO authenticated
USING (true);