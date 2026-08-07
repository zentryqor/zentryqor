CREATE TABLE public.credit_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paddle_transaction_id text NOT NULL UNIQUE,
  credits integer NOT NULL,
  amount_cents integer,
  currency text,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_purchases_user ON public.credit_purchases(user_id);

GRANT SELECT ON public.credit_purchases TO authenticated;
GRANT ALL ON public.credit_purchases TO service_role;

ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own credit purchases"
  ON public.credit_purchases FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.grant_bonus_credits(_user_id uuid, _amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total integer;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    SELECT bonus_credits INTO new_total FROM public.profiles WHERE id = _user_id;
    RETURN COALESCE(new_total, 0);
  END IF;

  UPDATE public.profiles
     SET bonus_credits = bonus_credits + _amount
   WHERE id = _user_id
  RETURNING bonus_credits INTO new_total;

  RETURN COALESCE(new_total, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_bonus_credits(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_bonus_credits(uuid, integer) TO service_role;