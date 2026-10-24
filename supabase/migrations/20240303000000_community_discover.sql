-- ====================================================================================
-- PHASE 5: COMMUNITY DISCOVER — Analytics & Trending Support
-- ====================================================================================

-- 1. Discover events (impressions, clicks, dismissals, follows-from-discover)
CREATE TABLE IF NOT EXISTS public.community_discover_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL, -- IMPRESSION | CLICK | DISMISS | JOIN_CLICK | FOLLOW_CLICK
    surface VARCHAR(50),             -- recommended | rising | new | near_me | all | search | categories
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discover_events_community
    ON public.community_discover_events(community_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_discover_events_identity
    ON public.community_discover_events(identity_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_discover_events_rising
    ON public.community_discover_events(event_type, created_at DESC)
    WHERE created_at > NOW() - INTERVAL '14 days';

-- 2. Discover dismissals (persistent — "don't show me this again")
CREATE TABLE IF NOT EXISTS public.community_discover_dismissals (
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (identity_id, community_id)
);

-- 3. RLS
ALTER TABLE public.community_discover_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_discover_dismissals  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discover_events_insert" ON public.community_discover_events;
CREATE POLICY "discover_events_insert" ON public.community_discover_events
    FOR INSERT WITH CHECK (identity_id = auth.uid() OR identity_id IS NULL);

DROP POLICY IF EXISTS "discover_events_read_own" ON public.community_discover_events;
CREATE POLICY "discover_events_read_own" ON public.community_discover_events
    FOR SELECT USING (identity_id = auth.uid());

DROP POLICY IF EXISTS "discover_dismissals_own" ON public.community_discover_dismissals;
CREATE POLICY "discover_dismissals_own" ON public.community_discover_dismissals
    FOR ALL USING (identity_id = auth.uid()) WITH CHECK (identity_id = auth.uid());

-- 4. Helper: rising score view (last 14 days weighted engagement)
CREATE OR REPLACE VIEW public.community_rising_scores AS
SELECT
    c.id AS community_id,
    c.slug,
    c.name,
    c.member_count,
    c.view_count,
    COALESCE(events_agg.impressions, 0) AS recent_impressions,
    COALESCE(events_agg.clicks, 0) AS recent_clicks,
    COALESCE(events_agg.joins, 0) AS recent_joins,
    COALESCE(mem_agg.new_members, 0) AS new_members_14d,
    (
        COALESCE(events_agg.clicks, 0) * 1.0 +
        COALESCE(events_agg.joins, 0) * 5.0 +
        COALESCE(mem_agg.new_members, 0) * 3.0
    ) AS rising_score
FROM public.communities c
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) FILTER (WHERE event_type = 'IMPRESSION') AS impressions,
        COUNT(*) FILTER (WHERE event_type = 'CLICK') AS clicks,
        COUNT(*) FILTER (WHERE event_type = 'JOIN_CLICK') AS joins
    FROM public.community_discover_events
    WHERE community_id = c.id
      AND created_at > NOW() - INTERVAL '14 days'
) events_agg ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS new_members
    FROM public.community_memberships
    WHERE community_id = c.id
      AND status = 'ACTIVE'
      AND joined_at > NOW() - INTERVAL '14 days'
) mem_agg ON true
WHERE c.status = 'ACTIVE'
  AND c.visibility IN ('PUBLIC', 'UNLISTED');