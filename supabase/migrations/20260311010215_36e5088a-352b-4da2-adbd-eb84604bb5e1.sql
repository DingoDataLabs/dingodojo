
-- Create maths_working_submissions table
CREATE TABLE public.maths_working_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  worked_solution_type text NOT NULL DEFAULT 'working',
  correct_answer integer DEFAULT NULL,
  clear_working integer DEFAULT NULL,
  correct_method integer DEFAULT NULL,
  neat_layout integer DEFAULT NULL,
  composite_score numeric DEFAULT NULL,
  transcribed_working text DEFAULT NULL,
  feedback text DEFAULT NULL,
  overall_rating text DEFAULT NULL,
  annotations jsonb DEFAULT '[]'::jsonb,
  bonus_xp_awarded integer DEFAULT 0,
  image_path text DEFAULT NULL,
  input_method text DEFAULT 'photographed',
  subject_name text DEFAULT NULL,
  topic_name text DEFAULT NULL,
  question text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maths_working_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can insert their own maths submissions"
  ON public.maths_working_submissions
  FOR INSERT TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own maths submissions"
  ON public.maths_working_submissions
  FOR SELECT TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
