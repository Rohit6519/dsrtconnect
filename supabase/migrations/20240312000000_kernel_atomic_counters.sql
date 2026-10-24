-- ====================================================================================
-- PHASE B: Atomic Counter RPC — safe increment for any allowlisted counter column
-- ====================================================================================

CREATE OR REPLACE FUNCTION public.rpc_atomic_increment(
  p_table TEXT,
  p_id UUID,
  p_column TEXT,
  p_delta INTEGER DEFAULT 1
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_value INTEGER;
BEGIN
  -- Whitelist tables + columns. Any (table, column) not in this list is rejected.
  IF (p_table, p_column) NOT IN (
    ('communities', 'member_count'),
    ('communities', 'post_count'),
    ('communities', 'view_count'),
    ('communities', 'like_count'),
    ('community_posts_v2', 'reaction_count'),
    ('community_posts_v2', 'comment_count'),
    ('community_posts_v2', 'view_count'),
    ('community_comments', 'reaction_count'),
    ('community_comments', 'reply_count'),
    ('event_events', 'view_count')
  ) THEN
    RAISE EXCEPTION 'rpc_atomic_increment: (table=%, column=%) not whitelisted', p_table, p_column
      USING ERRCODE = '42501';
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET %I = GREATEST(0, COALESCE(%I, 0) + $1) WHERE id = $2 RETURNING %I',
    p_table, p_column, p_column, p_column
  )
  INTO v_new_value
  USING p_delta, p_id;

  RETURN COALESCE(v_new_value, 0);
END;
$$;

-- Convenience aliases that keep older code paths working (Phase 10 rpc_increment).
-- If the old function exists, we rewrite it to delegate to the safer whitelisted version.
CREATE OR REPLACE FUNCTION public.rpc_increment(
  p_table TEXT,
  p_id UUID,
  p_field TEXT,
  p_delta INTEGER DEFAULT 1
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.rpc_atomic_increment(p_table, p_id, p_field, p_delta);
END;
$$;