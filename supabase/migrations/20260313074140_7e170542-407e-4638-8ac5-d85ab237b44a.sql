
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS best_streak integer DEFAULT 0;

CREATE TABLE public.weekly_goal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  xp_earned integer NOT NULL DEFAULT 0,
  xp_goal integer NOT NULL DEFAULT 500,
  goal_met boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, week_start_date)
);

ALTER TABLE public.weekly_goal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goal history" ON public.weekly_goal_history
  FOR SELECT TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own goal history" ON public.weekly_goal_history
  FOR INSERT TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
