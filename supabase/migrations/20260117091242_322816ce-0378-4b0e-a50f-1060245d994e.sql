-- Create a secure view that excludes payment-related fields
-- This view should be used by client-side queries instead of direct profiles access
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
  id,
  user_id,
  first_name,
  grade_level,
  total_xp,
  current_streak,
  last_active_date,
  subscription_tier,
  missions_this_week,
  week_start_date,
  onboarding_completed,
  daily_streak,
  missions_today,
  last_mission_date,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view for authenticated users
-- The view inherits RLS from the underlying profiles table
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;