CREATE OR REPLACE FUNCTION public.ensure_referral_code(_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing TEXT;
  new_code TEXT;
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i INT;
BEGIN
  SELECT code INTO existing FROM public.referral_codes WHERE user_id = _user_id;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  LOOP
    new_code := '';
    FOR i IN 1..8 LOOP
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    BEGIN
      INSERT INTO public.referral_codes (user_id, code) VALUES (_user_id, new_code);
      RETURN new_code;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;
END;
$function$;