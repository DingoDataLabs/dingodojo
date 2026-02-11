
-- Create storage bucket for handwriting submissions
INSERT INTO storage.buckets (id, name, public) VALUES ('handwriting-submissions', 'handwriting-submissions', true);

-- Storage policies: authenticated users can upload to their own folder
CREATE POLICY "Users can upload handwriting images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'handwriting-submissions'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own handwriting images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'handwriting-submissions'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own handwriting images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'handwriting-submissions'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Public read access for thumbnails
CREATE POLICY "Public read access for handwriting images"
ON storage.objects FOR SELECT
USING (bucket_id = 'handwriting-submissions');

-- Create handwriting_submissions table
CREATE TABLE public.handwriting_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_path text,
  letter_formation integer CHECK (letter_formation BETWEEN 1 AND 5),
  spacing_sizing integer CHECK (spacing_sizing BETWEEN 1 AND 5),
  presentation integer CHECK (presentation BETWEEN 1 AND 5),
  composite_score numeric,
  transcribed_text text,
  content_score integer,
  content_max_score integer,
  content_feedback text,
  content_overall_rating text,
  subject_name text,
  topic_name text,
  question text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.handwriting_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own handwriting submissions"
ON public.handwriting_submissions FOR SELECT
USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own handwriting submissions"
ON public.handwriting_submissions FOR INSERT
WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
