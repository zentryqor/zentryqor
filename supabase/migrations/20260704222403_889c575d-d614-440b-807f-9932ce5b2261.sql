
-- ============= gallery_items =============
CREATE TABLE public.gallery_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('text','image')),
  prompt TEXT NOT NULL,
  output_text TEXT,
  image_url TEXT,
  title TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX gallery_items_public_created_idx ON public.gallery_items (is_public, created_at DESC);
CREATE INDEX gallery_items_user_idx ON public.gallery_items (user_id, created_at DESC);

GRANT SELECT ON public.gallery_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_items TO authenticated;
GRANT ALL ON public.gallery_items TO service_role;

ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public gallery items are readable by all"
  ON public.gallery_items FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users manage their own gallery items"
  ON public.gallery_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER gallery_items_touch_updated_at
  BEFORE UPDATE ON public.gallery_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= referral_codes =============
CREATE TABLE public.referral_codes (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.referral_codes TO anon;
GRANT SELECT, INSERT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referral codes are publicly readable"
  ON public.referral_codes FOR SELECT
  USING (true);

CREATE POLICY "Users create their own referral code"
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============= referrals =============
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_referrer INTEGER NOT NULL DEFAULT 0,
  credits_referee INTEGER NOT NULL DEFAULT 0,
  awarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (referrer_id <> referee_id)
);

CREATE INDEX referrals_referrer_idx ON public.referrals (referrer_id);

GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see referrals involving them"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- ============= templates =============
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('text','image')),
  prompt TEXT NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  cover_image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX templates_category_idx ON public.templates (category, sort_order);

GRANT SELECT ON public.templates TO anon, authenticated;
GRANT ALL ON public.templates TO service_role;

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates are publicly readable"
  ON public.templates FOR SELECT
  USING (true);

CREATE TRIGGER templates_touch_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= profiles.bonus_credits =============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bonus_credits INTEGER NOT NULL DEFAULT 0;

-- ============= helper functions =============

-- Generate/lookup a referral code for a user
CREATE OR REPLACE FUNCTION public.ensure_referral_code(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing TEXT;
  new_code TEXT;
BEGIN
  SELECT code INTO existing FROM public.referral_codes WHERE user_id = _user_id;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  LOOP
    new_code := upper(substring(encode(gen_random_bytes(6), 'hex') from 1 for 8));
    BEGIN
      INSERT INTO public.referral_codes (user_id, code) VALUES (_user_id, new_code);
      RETURN new_code;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;
END;
$$;

-- Record that _referee was invited by _code (called at first sign-in)
CREATE OR REPLACE FUNCTION public.record_referral(_referee UUID, _code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_user UUID;
BEGIN
  IF _referee IS NULL OR _code IS NULL OR length(_code) = 0 THEN
    RETURN FALSE;
  END IF;

  SELECT user_id INTO ref_user FROM public.referral_codes WHERE code = upper(_code);
  IF ref_user IS NULL OR ref_user = _referee THEN
    RETURN FALSE;
  END IF;

  BEGIN
    INSERT INTO public.referrals (referrer_id, referee_id) VALUES (ref_user, _referee);
    RETURN TRUE;
  EXCEPTION WHEN unique_violation THEN
    RETURN FALSE;
  END;
END;
$$;

-- Award referral bonus after first generation
CREATE OR REPLACE FUNCTION public.award_referral_bonus(_referee UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  referrer_bonus INTEGER := 20;
  referee_bonus INTEGER := 10;
BEGIN
  SELECT * INTO r FROM public.referrals
   WHERE referee_id = _referee AND awarded_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles SET bonus_credits = bonus_credits + referee_bonus WHERE id = _referee;
  UPDATE public.profiles SET bonus_credits = bonus_credits + referrer_bonus WHERE id = r.referrer_id;

  UPDATE public.referrals
     SET awarded_at = now(),
         credits_referrer = referrer_bonus,
         credits_referee = referee_bonus
   WHERE id = r.id;

  RETURN TRUE;
END;
$$;

-- Consume bonus credits (returns amount actually consumed)
CREATE OR REPLACE FUNCTION public.consume_bonus_credits(_user_id UUID, _amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available INTEGER;
  used INTEGER;
BEGIN
  SELECT bonus_credits INTO available FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF available IS NULL OR available <= 0 OR _amount <= 0 THEN
    RETURN 0;
  END IF;
  used := LEAST(available, _amount);
  UPDATE public.profiles SET bonus_credits = bonus_credits - used WHERE id = _user_id;
  RETURN used;
END;
$$;

-- ============= seed templates =============
INSERT INTO public.templates (slug, title, description, category, kind, prompt, seo_title, seo_description, sort_order) VALUES
  ('youtube-thumbnail', 'YouTube thumbnail', 'High-contrast, click-worthy thumbnail with bold subject and 2-3 word overlay.', 'Video', 'image', 'A vibrant, high-contrast YouTube thumbnail featuring [SUBJECT] with dramatic lighting, bold facial expression, punchy background color, and space for a 2-3 word text overlay. Photorealistic, 16:9.', 'Free YouTube Thumbnail Generator — AI Prompt Template | Zentry Qor', 'Generate scroll-stopping YouTube thumbnails with our AI prompt template. Get bold, click-worthy designs in seconds.', 1),
  ('instagram-ad', 'Instagram ad creative', 'Square product ad with clean typography and eye-catching background.', 'Ads', 'image', 'A clean, modern Instagram ad featuring [PRODUCT] on a soft gradient background, minimal typography with a strong headline and CTA, product-centered composition, square 1:1 format.', 'Instagram Ad Creative AI Template | Zentry Qor', 'Create high-performing Instagram ad creatives with proven AI prompts. Try the template free.', 2),
  ('linkedin-post', 'LinkedIn thought-leadership post', 'Punchy 3-paragraph post with hook, insight, and CTA.', 'Social', 'text', 'Write a LinkedIn post for a [ROLE] in [INDUSTRY]. Format: strong hook line, one short story or data point, one contrarian insight, one clear CTA question. Max 180 words. Conversational, no jargon, no hashtag stuffing.', 'LinkedIn Post AI Generator | Zentry Qor', 'Craft engaging LinkedIn posts with a proven AI template. Hooks, insights, and CTAs that drive comments.', 3),
  ('product-shot', 'E-commerce product shot', 'Studio-lit product photo on gradient background.', 'E-commerce', 'image', 'Professional studio product photograph of [PRODUCT] on a soft [COLOR] gradient background, three-point lighting, subtle shadow, ultra-sharp focus, commercial quality, no text, 1:1.', 'AI Product Photography Generator | Zentry Qor', 'Generate studio-quality e-commerce product shots with AI. No camera required — try the template free.', 4),
  ('blog-header', 'Blog post header image', 'Editorial-style hero image for a blog article.', 'Blog', 'image', 'An editorial-style blog header image for an article about [TOPIC]. Cinematic composition, muted color palette, subtle depth of field, 16:9, no text overlays.', 'Blog Header AI Generator | Zentry Qor', 'Create beautiful, editorial-style blog headers with AI. Free prompt template.', 5),
  ('tweet-thread', 'Twitter/X thread starter', '5-tweet thread with hook, 3 insights, and CTA.', 'Social', 'text', 'Write a 5-tweet X thread about [TOPIC]. Tweet 1: 1-sentence hook that promises value. Tweets 2-4: one concrete insight each with an example. Tweet 5: CTA. Under 280 chars each, no hashtags, no emojis in tweet 1.', 'Twitter Thread AI Generator | Zentry Qor', 'Write viral-ready X threads with a proven AI prompt. Try the free template.', 6),
  ('email-subject', 'Cold email subject lines', 'Ten scroll-stopping cold email subject lines.', 'Email', 'text', 'Write 10 cold email subject lines for a [PRODUCT] targeting [PERSONA]. Under 50 characters each. Mix curiosity, benefit, and specificity. No spam trigger words. Return as a numbered list.', 'Cold Email Subject Line AI Generator | Zentry Qor', 'Generate 10 high-open-rate cold email subject lines with AI. Free template.', 7),
  ('logo-concept', 'Logo concept art', 'Clean vector-style mark for a brand.', 'Branding', 'image', 'A minimal, modern logo mark for a brand named [BRAND] in the [INDUSTRY] space. Clean geometric shapes, single accent color on white background, vector style, centered composition, no text, high resolution.', 'AI Logo Concept Generator | Zentry Qor', 'Explore logo concepts with AI. Vector-style marks in seconds. Free prompt template.', 8);
