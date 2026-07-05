CREATE OR REPLACE FUNCTION public.award_referral_bonus(_referee uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  referrer_bonus INTEGER := 50;
  referee_bonus INTEGER := 30;
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
$function$;

CREATE OR REPLACE FUNCTION public.get_referrer_by_code(_code text)
 RETURNS TABLE(display_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(p.display_name, split_part(p.email, '@', 1), 'A friend')
  FROM public.referral_codes rc
  JOIN public.profiles p ON p.id = rc.user_id
  WHERE rc.code = upper(_code)
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_referrer_by_code(text) TO anon, authenticated;