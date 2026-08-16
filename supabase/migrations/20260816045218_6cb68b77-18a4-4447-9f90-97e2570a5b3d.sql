CREATE TABLE IF NOT EXISTS public.chat_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_skills TO authenticated;
GRANT ALL ON public.chat_skills TO service_role;
ALTER TABLE public.chat_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own chat skills" ON public.chat_skills;
CREATE POLICY "Users manage their own chat skills" ON public.chat_skills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);