-- ====================================================================================
-- PHASE 15: ECOSYSTEM INTEGRATION + ANALYTICS + RECOMMENDATION + MIGRATION
-- ====================================================================================

-- ────────────────────────────────────────────────────────────────────────────────────
-- 1. UNIFIED ACTIVITY
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ecosystem_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verb VARCHAR(80) NOT NULL,
    object_type VARCHAR(60) NOT NULL,
    object_id UUID NOT NULL,
    target_type VARCHAR(60),
    target_id UUID,
    community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
    visibility VARCHAR(30) NOT NULL DEFAULT 'PUBLIC',
    reason_codes TEXT[],
    metadata JSONB,
    event_id VARCHAR(255) UNIQUE,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eco_activity_actor ON public.ecosystem_activity(actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_eco_activity_community ON public.ecosystem_activity(community_id, occurred_at DESC) WHERE community_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eco_activity_object ON public.ecosystem_activity(object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_eco_activity_verb ON public.ecosystem_activity(verb, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_eco_activity_feed ON public.ecosystem_activity(visibility, occurred_at DESC) WHERE visibility = 'PUBLIC';

ALTER TABLE public.ecosystem_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eco_activity_read" ON public.ecosystem_activity;
CREATE POLICY "eco_activity_read" ON public.ecosystem_activity FOR SELECT USING (
  visibility = 'PUBLIC'
  OR actor_id = auth.uid()
  OR (community_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.community_memberships cm
    WHERE cm.community_id = ecosystem_activity.community_id
      AND cm.identity_id = auth.uid()
      AND cm.status = 'ACTIVE'
  ))
);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 2. RECOMMENDATION ENGINE
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ecosystem_recommendation_features (
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_key VARCHAR(80) NOT NULL,
    value NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (identity_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_rec_features_identity ON public.ecosystem_recommendation_features(identity_id);

CREATE TABLE IF NOT EXISTS public.ecosystem_recommendation_candidates (
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type VARCHAR(60) NOT NULL,
    entity_id UUID NOT NULL,
    score NUMERIC NOT NULL DEFAULT 0,
    reason_codes TEXT[] DEFAULT '{}',
    human_reason TEXT,
    model_version VARCHAR(30),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    PRIMARY KEY (identity_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_rec_candidates_identity_type
    ON public.ecosystem_recommendation_candidates(identity_id, entity_type, score DESC);
CREATE INDEX IF NOT EXISTS idx_rec_candidates_expires
    ON public.ecosystem_recommendation_candidates(expires_at);

ALTER TABLE public.ecosystem_recommendation_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecosystem_recommendation_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rec_features_own" ON public.ecosystem_recommendation_features;
CREATE POLICY "rec_features_own" ON public.ecosystem_recommendation_features FOR SELECT USING (identity_id = auth.uid());

DROP POLICY IF EXISTS "rec_candidates_own" ON public.ecosystem_recommendation_candidates;
CREATE POLICY "rec_candidates_own" ON public.ecosystem_recommendation_candidates FOR SELECT USING (identity_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────────────
-- 3. ANALYTICS ROLLUPS
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.analytics_community_daily_rollups (
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    member_count INTEGER NOT NULL DEFAULT 0,
    new_members INTEGER NOT NULL DEFAULT 0,
    active_members INTEGER NOT NULL DEFAULT 0,
    post_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    reaction_count INTEGER NOT NULL DEFAULT 0,
    event_count INTEGER NOT NULL DEFAULT 0,
    registration_count INTEGER NOT NULL DEFAULT 0,
    application_count INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (community_id, date)
);

CREATE INDEX IF NOT EXISTS idx_rollups_community_date
    ON public.analytics_community_daily_rollups(community_id, date DESC);

ALTER TABLE public.analytics_community_daily_rollups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rollups_read_admin" ON public.analytics_community_daily_rollups;
CREATE POLICY "rollups_read_admin" ON public.analytics_community_daily_rollups FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.community_memberships cm
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE cm.community_id = analytics_community_daily_rollups.community_id
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER','ADMIN')
  )
);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 4. FEATURE FLAG SEED
-- ────────────────────────────────────────────────────────────────────────────────────

INSERT INTO public.kernel_feature_flags (key, enabled, rollout_percent, description)
VALUES ('community_hub_v2', false, 0, 'Community Hub rebuild — phased rollout')
ON CONFLICT (key) DO NOTHING;

-- Realtime for activity feed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ecosystem_activity') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ecosystem_activity;
  END IF;
END $$;