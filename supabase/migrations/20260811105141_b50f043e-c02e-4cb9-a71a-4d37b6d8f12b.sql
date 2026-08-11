CREATE TABLE public.caption_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  video_path text,
  video_name text,
  duration_sec numeric,
  words jsonb NOT NULL DEFAULT '[]'::jsonb,
  cuts jsonb NOT NULL DEFAULT '[]'::jsonb,
  style_id text,
  size_mult numeric NOT NULL DEFAULT 1,
  color_override text,
  font_url text,
  font_family text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caption_projects TO authenticated;
GRANT ALL ON public.caption_projects TO service_role;
ALTER TABLE public.caption_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own caption projects" ON public.caption_projects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER caption_projects_touch BEFORE UPDATE ON public.caption_projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.caption_fonts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caption_fonts TO authenticated;
GRANT ALL ON public.caption_fonts TO service_role;
ALTER TABLE public.caption_fonts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own fonts" ON public.caption_fonts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);