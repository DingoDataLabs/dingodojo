
-- Table for both typed and handwritten submissions
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  submission_type text NOT NULL DEFAULT 'typed', -- 'typed' or 'handwritten'
  subject_name text,
  topic_name text,
  question text,
  student_text text,
  image_path text,
  -- Content assessment
  content_score integer,
  content_max_score integer,
  content_feedback text,
  content_overall_rating text,
  strengths jsonb DEFAULT '[]'::jsonb,
  improvements jsonb DEFAULT '[]'::jsonb,
  annotations jsonb DEFAULT '[]'::jsonb,
  -- Handwriting assessment (null for typed)
  letter_formation integer,
  spacing_sizing integer,
  presentation integer,
  composite_score numeric,
  letter_formation_comment text,
  spacing_sizing_comment text,
  presentation_comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own submissions"
ON public.submissions FOR INSERT TO authenticated
WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own submissions"
ON public.submissions FOR SELECT TO authenticated
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
