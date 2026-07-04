
-- Phase 3: Generation library with folders and prompt version history

CREATE TABLE public.generation_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_folders TO authenticated;
GRANT ALL ON public.generation_folders TO service_role;
ALTER TABLE public.generation_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own folders read" ON public.generation_folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own folders insert" ON public.generation_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own folders update" ON public.generation_folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own folders delete" ON public.generation_folders FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_generation_folders_updated_at BEFORE UPDATE ON public.generation_folders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES public.generation_folders(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.generations(id) ON DELETE SET NULL,
  tool_id text NOT NULL,
  tool_name text,
  kind text NOT NULL CHECK (kind IN ('text','image')),
  prompt text NOT NULL,
  system_prompt text,
  input text,
  output_text text,
  output_image text,
  aspect_ratio text,
  is_favorite boolean NOT NULL DEFAULT false,
  credits_cost integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generations TO authenticated;
GRANT ALL ON public.generations TO service_role;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own generations read" ON public.generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own generations insert" ON public.generations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own generations update" ON public.generations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own generations delete" ON public.generations FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_generations_updated_at BEFORE UPDATE ON public.generations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_generations_user_created ON public.generations(user_id, created_at DESC);
CREATE INDEX idx_generations_user_folder ON public.generations(user_id, folder_id);
CREATE INDEX idx_generations_parent ON public.generations(parent_id);
