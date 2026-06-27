
-- Rate limit buckets (fixed window)
CREATE TABLE public.rate_limit_buckets (
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);

GRANT ALL ON public.rate_limit_buckets TO service_role;

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- No policies: only service_role and SECURITY DEFINER functions can touch this.

CREATE INDEX rate_limit_buckets_window_idx ON public.rate_limit_buckets (window_start);

-- Auth failure tracking
CREATE TABLE public.auth_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_lower text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.auth_failures TO service_role;

ALTER TABLE public.auth_failures ENABLE ROW LEVEL SECURITY;

CREATE INDEX auth_failures_email_created_idx ON public.auth_failures (email_lower, created_at DESC);

-- Rate limit consumer
CREATE OR REPLACE FUNCTION public.consume_rate_limit(_key text, _max integer, _window_seconds integer)
RETURNS TABLE(allowed boolean, remaining integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  epoch_now bigint := extract(epoch from now())::bigint;
  win_start timestamptz := to_timestamp(epoch_now - (epoch_now % _window_seconds));
  win_end timestamptz := win_start + make_interval(secs => _window_seconds);
  cur integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(_key || ':' || win_start::text, 0));

  INSERT INTO public.rate_limit_buckets (bucket_key, window_start, count)
  VALUES (_key, win_start, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET count = public.rate_limit_buckets.count + 1
  RETURNING public.rate_limit_buckets.count INTO cur;

  -- Opportunistic cleanup of very old buckets (>1 day)
  DELETE FROM public.rate_limit_buckets WHERE window_start < now() - interval '1 day';

  IF cur > _max THEN
    RETURN QUERY SELECT false, 0, win_end;
  ELSE
    RETURN QUERY SELECT true, greatest(_max - cur, 0), win_end;
  END IF;
END;
$$;

-- Sign-in lockout helpers
CREATE OR REPLACE FUNCTION public.check_signin_lockout(_email text)
RETURNS TABLE(locked boolean, attempts integer, unlock_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  window_start timestamptz := now() - interval '15 minutes';
  cnt integer;
  last_at timestamptz;
BEGIN
  SELECT count(*)::int, max(created_at)
    INTO cnt, last_at
  FROM public.auth_failures
  WHERE email_lower = lower(_email)
    AND created_at >= window_start;

  IF cnt >= 5 THEN
    RETURN QUERY SELECT true, cnt, last_at + interval '15 minutes';
  ELSE
    RETURN QUERY SELECT false, cnt, NULL::timestamptz;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_signin_failure(_email text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.auth_failures (email_lower) VALUES (lower(_email));
  -- prune old failures for this email
  DELETE FROM public.auth_failures
    WHERE email_lower = lower(_email)
      AND created_at < now() - interval '1 day';
$$;

CREATE OR REPLACE FUNCTION public.clear_signin_failures(_email text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.auth_failures WHERE email_lower = lower(_email);
$$;

-- Restrict execution to backend only
REVOKE EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_signin_lockout(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_signin_failure(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clear_signin_failures(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_signin_lockout(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_signin_failure(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_signin_failures(text) TO service_role;
