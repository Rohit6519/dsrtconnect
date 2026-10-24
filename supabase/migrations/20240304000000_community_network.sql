-- ====================================================================================
-- PHASE 6: COMMUNITY HUB — MY NETWORK
-- Fully backward-compatible. Zero destructive operations.
-- ====================================================================================

-- ────────────────────────────────────────────────────────────────────────────────────
-- 1. Backfill community_follows_v2 from legacy follows table
-- ────────────────────────────────────────────────────────────────────────────────────

INSERT INTO public.community_follows_v2 (identity_id, community_id, followed_at)
SELECT f.follower_id, f.following_id, COALESCE(f.created_at, NOW())
FROM public.follows f
WHERE f.following_type = 'community'
  AND f.follower_id IS NOT NULL
  AND f.following_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.communities c WHERE c.id = f.following_id)
ON CONFLICT (identity_id, community_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────────────
-- 2. Activity Projection table — read model for the network activity feed
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_activity_projection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verb VARCHAR(60) NOT NULL,
    object_type VARCHAR(60),
    object_id UUID,
    subject_identity_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    visibility VARCHAR(30) NOT NULL DEFAULT 'MEMBERS',
    metadata JSONB,
    event_id VARCHAR(255) UNIQUE,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_proj_community
    ON public.community_activity_projection(community_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_proj_actor
    ON public.community_activity_projection(actor_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_proj_subject
    ON public.community_activity_projection(subject_identity_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_proj_verb
    ON public.community_activity_projection(verb, occurred_at DESC);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 3. Backfill activity projection with historical community events (best-effort)
-- ────────────────────────────────────────────────────────────────────────────────────

-- Backfill from existing memberships (JOINED events)
INSERT INTO public.community_activity_projection
    (community_id, actor_id, verb, object_type, object_id, subject_identity_id, visibility, occurred_at, event_id)
SELECT
    cm.community_id,
    cm.identity_id,
    'community.member.joined',
    'community_membership',
    cm.id,
    cm.identity_id,
    'MEMBERS',
    cm.joined_at,
    'backfill_join_' || cm.id::text
FROM public.community_memberships cm
WHERE cm.status = 'ACTIVE'
  AND cm.joined_at IS NOT NULL
  AND cm.joined_at > NOW() - INTERVAL '90 days'
ON CONFLICT (event_id) DO NOTHING;

-- Backfill community.created events
INSERT INTO public.community_activity_projection
    (community_id, actor_id, verb, object_type, object_id, subject_identity_id, visibility, occurred_at, event_id)
SELECT
    c.id,
    c.owner_identity_id,
    'community.created',
    'community',
    c.id,
    c.owner_identity_id,
    'PUBLIC',
    c.created_at,
    'backfill_created_' || c.id::text
FROM public.communities c
WHERE c.owner_identity_id IS NOT NULL
  AND c.created_at > NOW() - INTERVAL '90 days'
ON CONFLICT (event_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────────────
-- 4. RLS
-- ────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.community_activity_projection ENABLE ROW LEVEL SECURITY;

-- Read: everyone can read public activity; members see MEMBERS-scoped activity
DROP POLICY IF EXISTS "activity_proj_read" ON public.community_activity_projection;
CREATE POLICY "activity_proj_read"
    ON public.community_activity_projection
    FOR SELECT
    USING (
      visibility = 'PUBLIC'
      OR EXISTS (
        SELECT 1 FROM public.community_memberships cm
        WHERE cm.community_id = community_activity_projection.community_id
          AND cm.identity_id = auth.uid()
          AND cm.status = 'ACTIVE'
      )
      OR actor_id = auth.uid()
      OR subject_identity_id = auth.uid()
    );

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_activity_projection'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_activity_projection;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────────────
-- 5. Helper view — "people you've met through communities"
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.community_network_edges AS
SELECT
    a.identity_id AS viewer_id,
    b.identity_id AS peer_id,
    COUNT(DISTINCT a.community_id) AS shared_communities,
    ARRAY_AGG(DISTINCT a.community_id) AS shared_community_ids,
    MAX(GREATEST(a.joined_at, b.joined_at)) AS most_recent_shared_at
FROM public.community_memberships a
JOIN public.community_memberships b
     ON a.community_id = b.community_id
    AND a.identity_id <> b.identity_id
WHERE a.status = 'ACTIVE'
  AND b.status = 'ACTIVE'
GROUP BY a.identity_id, b.identity_id;

-- Done.