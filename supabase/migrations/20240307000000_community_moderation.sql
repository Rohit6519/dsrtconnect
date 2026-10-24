-- ====================================================================================
-- PHASE 11: COMMUNITY MODERATION
-- Reports → Cases → Actions → Appeals
-- Fully idempotent.
-- ====================================================================================

-- ────────────────────────────────────────────────────────────────────────────────────
-- 1. REPORTS
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    reporter_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type VARCHAR(30) NOT NULL,
    target_id UUID NOT NULL,
    target_author_identity_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    priority_score INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    case_id UUID,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_community_status
    ON public.community_reports(community_id, status, priority_score DESC, created_at DESC)
    WHERE status IN ('OPEN', 'UNDER_REVIEW');

CREATE INDEX IF NOT EXISTS idx_reports_target
    ON public.community_reports(target_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_reporter
    ON public.community_reports(reporter_identity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_case
    ON public.community_reports(case_id) WHERE case_id IS NOT NULL;

-- Prevent same reporter reporting same target twice while OPEN/UNDER_REVIEW
CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_active
    ON public.community_reports(reporter_identity_id, target_type, target_id)
    WHERE status IN ('OPEN', 'UNDER_REVIEW');

DROP TRIGGER IF EXISTS trg_reports_updated ON public.community_reports;
CREATE TRIGGER trg_reports_updated
BEFORE UPDATE ON public.community_reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────────────
-- 2. MODERATION CASES (groups multiple reports on same target)
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_moderation_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    target_type VARCHAR(30) NOT NULL,
    target_id UUID NOT NULL,
    target_author_identity_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    priority_score INTEGER NOT NULL DEFAULT 0,
    report_count INTEGER NOT NULL DEFAULT 0,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution VARCHAR(60),
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_community_status
    ON public.community_moderation_cases(community_id, status, priority_score DESC, opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_cases_target
    ON public.community_moderation_cases(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_cases_assigned
    ON public.community_moderation_cases(assigned_to, status)
    WHERE status IN ('OPEN', 'UNDER_REVIEW');

-- One active case per target
CREATE UNIQUE INDEX IF NOT EXISTS uq_cases_active_per_target
    ON public.community_moderation_cases(community_id, target_type, target_id)
    WHERE status IN ('OPEN', 'UNDER_REVIEW');

DROP TRIGGER IF EXISTS trg_cases_updated ON public.community_moderation_cases;
CREATE TRIGGER trg_cases_updated
BEFORE UPDATE ON public.community_moderation_cases
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Now add FK from reports.case_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'community_reports_case_id_fkey'
      AND table_name = 'community_reports'
  ) THEN
    ALTER TABLE public.community_reports
      ADD CONSTRAINT community_reports_case_id_fkey
      FOREIGN KEY (case_id) REFERENCES public.community_moderation_cases(id) ON DELETE SET NULL;
  END IF;
END$$;

-- ────────────────────────────────────────────────────────────────────────────────────
-- 3. MODERATION ACTIONS (audit trail of decisions on a case)
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.community_moderation_cases(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(30) NOT NULL,
    target_id UUID NOT NULL,
    target_author_identity_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT,
    policy_code VARCHAR(50),
    duration_hours INTEGER,
    expires_at TIMESTAMPTZ,
    metadata JSONB,
    reversed_at TIMESTAMPTZ,
    reversed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reversal_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mod_actions_case ON public.community_moderation_actions(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mod_actions_community ON public.community_moderation_actions(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mod_actions_target_author ON public.community_moderation_actions(target_author_identity_id, created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 4. EVIDENCE (attachments to a case)
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_moderation_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.community_moderation_cases(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    evidence_type VARCHAR(30) NOT NULL,
    content_snapshot TEXT,
    file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
    url TEXT,
    note TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_case ON public.community_moderation_evidence(case_id, created_at ASC);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 5. APPEALS
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    appellant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_id UUID REFERENCES public.community_moderation_actions(id) ON DELETE SET NULL,
    case_id UUID REFERENCES public.community_moderation_cases(id) ON DELETE SET NULL,
    appeal_type VARCHAR(30) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    decision VARCHAR(30),
    decision_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appeals_community_status
    ON public.community_appeals(community_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_appeals_appellant
    ON public.community_appeals(appellant_id, created_at DESC);

-- One open appeal per action per appellant
CREATE UNIQUE INDEX IF NOT EXISTS uq_appeals_active
    ON public.community_appeals(appellant_id, action_id)
    WHERE status IN ('SUBMITTED', 'UNDER_REVIEW');

DROP TRIGGER IF EXISTS trg_appeals_updated ON public.community_appeals;
CREATE TRIGGER trg_appeals_updated
BEFORE UPDATE ON public.community_appeals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────────────
-- 6. RPCs
-- ────────────────────────────────────────────────────────────────────────────────────

-- Compute priority score based on reason + target reach + reporter history
CREATE OR REPLACE FUNCTION public.rpc_compute_report_priority(
  p_reason TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_community_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score INTEGER := 0;
  v_report_count INTEGER;
BEGIN
  -- Reason weight
  v_score := CASE p_reason
    WHEN 'ILLEGAL_CONTENT' THEN 100
    WHEN 'HATE' THEN 80
    WHEN 'HARASSMENT' THEN 70
    WHEN 'ABUSE' THEN 65
    WHEN 'IMPERSONATION' THEN 60
    WHEN 'SCAM' THEN 55
    WHEN 'MISINFORMATION' THEN 40
    WHEN 'SPAM' THEN 30
    WHEN 'OFF_TOPIC' THEN 15
    ELSE 20
  END;

  -- Prior report count on target (indicates repeat / severe)
  SELECT COUNT(*) INTO v_report_count
  FROM public.community_reports
  WHERE target_type = p_target_type
    AND target_id = p_target_id
    AND community_id = p_community_id;
  v_score := v_score + LEAST(30, v_report_count * 5);

  RETURN v_score;
END;
$$;

-- Reinstate members whose restrictions/bans expired
CREATE OR REPLACE FUNCTION public.rpc_expire_moderation_actions() RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired INTEGER := 0;
BEGIN
  -- Expire member_restrictions
  UPDATE public.community_member_restrictions
  SET ends_at = NOW()
  WHERE ends_at IS NOT NULL AND ends_at < NOW();

  -- Expire bans → set membership to LEFT (was BANNED)
  WITH expired_bans AS (
    SELECT community_id, identity_id
    FROM public.community_bans
    WHERE expires_at IS NOT NULL AND expires_at < NOW()
  )
  DELETE FROM public.community_bans
  WHERE (community_id, identity_id) IN (SELECT community_id, identity_id FROM expired_bans)
  RETURNING 1 INTO v_expired;

  RETURN COALESCE(v_expired, 0);
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────────────
-- 7. RLS
-- ────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.community_reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_moderation_cases     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_moderation_actions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_moderation_evidence  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_appeals              ENABLE ROW LEVEL SECURITY;

-- Reports: reporter sees own; moderators of the community see all
DROP POLICY IF EXISTS "reports_insert_own" ON public.community_reports;
CREATE POLICY "reports_insert_own"
  ON public.community_reports FOR INSERT
  WITH CHECK (reporter_identity_id = auth.uid());

DROP POLICY IF EXISTS "reports_read_own_or_mod" ON public.community_reports;
CREATE POLICY "reports_read_own_or_mod"
  ON public.community_reports FOR SELECT
  USING (
    reporter_identity_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_memberships cm
      JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
      JOIN public.community_roles cr ON cr.id = mr.role_id
      WHERE cm.community_id = community_reports.community_id
        AND cm.identity_id = auth.uid()
        AND cr.role_key IN ('OWNER', 'ADMIN', 'MODERATOR')
    )
  );

-- Moderation cases: moderators only
DROP POLICY IF EXISTS "cases_read_mod" ON public.community_moderation_cases;
CREATE POLICY "cases_read_mod"
  ON public.community_moderation_cases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_memberships cm
      JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
      JOIN public.community_roles cr ON cr.id = mr.role_id
      WHERE cm.community_id = community_moderation_cases.community_id
        AND cm.identity_id = auth.uid()
        AND cr.role_key IN ('OWNER', 'ADMIN', 'MODERATOR')
    )
    OR target_author_identity_id = auth.uid()
  );

DROP POLICY IF EXISTS "mod_actions_read_related" ON public.community_moderation_actions;
CREATE POLICY "mod_actions_read_related"
  ON public.community_moderation_actions FOR SELECT
  USING (
    target_author_identity_id = auth.uid()
    OR actor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_memberships cm
      JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
      JOIN public.community_roles cr ON cr.id = mr.role_id
      WHERE cm.community_id = community_moderation_actions.community_id
        AND cm.identity_id = auth.uid()
        AND cr.role_key IN ('OWNER', 'ADMIN', 'MODERATOR')
    )
  );

DROP POLICY IF EXISTS "evidence_read_mod" ON public.community_moderation_evidence;
CREATE POLICY "evidence_read_mod"
  ON public.community_moderation_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_moderation_cases c
      WHERE c.id = community_moderation_evidence.case_id
        AND EXISTS (
          SELECT 1 FROM public.community_memberships cm
          JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
          JOIN public.community_roles cr ON cr.id = mr.role_id
          WHERE cm.community_id = c.community_id
            AND cm.identity_id = auth.uid()
            AND cr.role_key IN ('OWNER', 'ADMIN', 'MODERATOR')
        )
    )
  );

-- Appeals: appellant sees own; moderators see all
DROP POLICY IF EXISTS "appeals_insert_own" ON public.community_appeals;
CREATE POLICY "appeals_insert_own"
  ON public.community_appeals FOR INSERT
  WITH CHECK (appellant_id = auth.uid());

DROP POLICY IF EXISTS "appeals_read_related" ON public.community_appeals;
CREATE POLICY "appeals_read_related"
  ON public.community_appeals FOR SELECT
  USING (
    appellant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_memberships cm
      JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
      JOIN public.community_roles cr ON cr.id = mr.role_id
      WHERE cm.community_id = community_appeals.community_id
        AND cm.identity_id = auth.uid()
        AND cr.role_key IN ('OWNER', 'ADMIN', 'MODERATOR')
    )
  );

-- Realtime for moderation queue
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_moderation_cases') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_moderation_cases;
  END IF;
END $$;

-- DONE