CREATE OR REPLACE FUNCTION public.claim_asset_download(_asset_id uuid, _daily_limit integer DEFAULT 3)
RETURNS TABLE (
  allowed boolean,
  downloads_used integer,
  downloads_remaining integer,
  daily_limit integer,
  reset_at timestamptz,
  message text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  premium boolean;
  asset_is_premium boolean;
  today_start timestamptz := date_trunc('day', now());
  tomorrow_start timestamptz := date_trunc('day', now()) + interval '1 day';
  current_count integer;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT a.premium_only INTO asset_is_premium
  FROM public.assets a
  WHERE a.id = _asset_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, _daily_limit, _daily_limit, tomorrow_start, 'Asset not found or locked.'::text;
    RETURN;
  END IF;

  premium := public.is_premium(current_user_id);

  IF asset_is_premium AND NOT premium THEN
    RETURN QUERY SELECT false, 0, 0, _daily_limit, tomorrow_start, 'Premium membership required.'::text;
    RETURN;
  END IF;

  IF premium THEN
    INSERT INTO public.asset_downloads (user_id, asset_id)
    VALUES (current_user_id, _asset_id);
    RETURN QUERY SELECT true, 0, NULL::integer, NULL::integer, tomorrow_start, NULL::text;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':' || today_start::date::text, 0));

  SELECT count(*)::integer INTO current_count
  FROM public.asset_downloads
  WHERE user_id = current_user_id
    AND created_at >= today_start
    AND created_at < tomorrow_start;

  IF current_count >= _daily_limit THEN
    RETURN QUERY SELECT
      false,
      current_count,
      0,
      _daily_limit,
      tomorrow_start,
      format('Daily download limit reached (%s/day on Free). Upgrade to Premium for unlimited downloads.', _daily_limit)::text;
    RETURN;
  END IF;

  INSERT INTO public.asset_downloads (user_id, asset_id)
  VALUES (current_user_id, _asset_id);

  current_count := current_count + 1;

  RETURN QUERY SELECT
    true,
    current_count,
    greatest(_daily_limit - current_count, 0),
    _daily_limit,
    tomorrow_start,
    NULL::text;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_asset_download(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_asset_download(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_asset_download(uuid, integer) TO service_role;