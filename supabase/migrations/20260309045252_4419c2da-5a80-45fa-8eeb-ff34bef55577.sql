
-- 1. Protect subscription_tier and stripe_customer_id from direct client updates
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
    RAISE EXCEPTION 'subscription_tier cannot be modified directly';
  END IF;
  IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
    RAISE EXCEPTION 'stripe_customer_id cannot be modified directly';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profiles_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (current_setting('role') != 'service_role')
  EXECUTE FUNCTION public.protect_profile_fields();

-- 2. Fix generated_modules RLS: remove overbroad 1-hour time window
DROP POLICY IF EXISTS "Users can view modules for topics they have progress on" ON public.generated_modules;

CREATE POLICY "Users can view modules for topics they have progress on"
ON public.generated_modules
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM student_progress sp
    JOIN profiles p ON sp.student_id = p.id
    WHERE p.user_id = auth.uid()
      AND sp.topic_id = generated_modules.topic_id
  )
);
