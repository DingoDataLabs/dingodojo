
-- 1. Drop overly permissive username search policy (now handled by search_users_by_username function)
DROP POLICY IF EXISTS "Users can search profiles by username" ON public.profiles;

-- 2. Fix user_profiles view with security_invoker
DROP VIEW IF EXISTS public.user_profiles;
CREATE VIEW public.user_profiles WITH (security_invoker = true) AS
SELECT
  id, user_id, first_name, grade_level, subscription_tier,
  total_xp, current_streak, weekly_xp_earned, weekly_xp_goal,
  vacation_passes, last_term_replenish_date, last_active_date,
  last_mission_date, week_start_date, onboarding_completed,
  created_at, updated_at, username
FROM public.profiles;

-- 3. Make handwriting bucket private
UPDATE storage.buckets SET public = false WHERE id = 'handwriting-submissions';

-- 4. Drop the public read policy for handwriting images
DROP POLICY IF EXISTS "Public read access for handwriting images" ON storage.objects;
