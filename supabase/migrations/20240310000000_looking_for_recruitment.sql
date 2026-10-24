-- ====================================================================================
-- PHASE 14: LOOKING FOR + RECRUITMENT
-- ====================================================================================

-- ────────────────────────────────────────────────────────────────────────────────────
-- 1. LOOKING FOR LISTINGS
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.looking_for_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    owner_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    public_id VARCHAR(30) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    title VARCHAR(300) NOT NULL,
    role VARCHAR(120),
    tagline VARCHAR(300),
    description TEXT,
    category VARCHAR(60),
    commitment VARCHAR(40),
    remote_policy VARCHAR(40),
    location_text VARCHAR(255),
    experience_level VARCHAR(40),
    skills TEXT[] DEFAULT '{}',
    compensation VARCHAR(120),
    application_form_id UUID REFERENCES public.operations_forms(id) ON DELETE SET NULL,
    application_workflow_id UUID REFERENCES public.operations_workflows(id) ON DELETE SET NULL,
    application_board_id UUID REFERENCES public.operations_bucket_boards(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    application_count INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    opens_at TIMESTAMPTZ,
    closes_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    filled_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(community_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_listings_community_status
    ON public.looking_for_listings(community_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_public_id
    ON public.looking_for_listings(public_id);
CREATE INDEX IF NOT EXISTS idx_listings_open_public
    ON public.looking_for_listings(status, published_at DESC)
    WHERE status = 'OPEN';

DROP TRIGGER IF EXISTS trg_listings_updated ON public.looking_for_listings;
CREATE TRIGGER trg_listings_updated
BEFORE UPDATE ON public.looking_for_listings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_listing_public_id() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := 'LFR-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listings_public_id ON public.looking_for_listings;
CREATE TRIGGER trg_listings_public_id
BEFORE INSERT ON public.looking_for_listings
FOR EACH ROW EXECUTE FUNCTION public.set_listing_public_id();

-- ────────────────────────────────────────────────────────────────────────────────────
-- 2. APPLICATIONS
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.looking_for_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.looking_for_listings(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    applicant_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    form_submission_id UUID REFERENCES public.operations_form_submissions(id) ON DELETE SET NULL,
    workflow_run_id UUID REFERENCES public.operations_workflow_runs(id) ON DELETE SET NULL,
    bucket_item_id UUID REFERENCES public.operations_bucket_items(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    current_stage VARCHAR(60) NOT NULL DEFAULT 'NEW',
    priority INTEGER NOT NULL DEFAULT 100,
    withdrawn_at TIMESTAMPTZ,
    withdraw_reason TEXT,
    decided_at TIMESTAMPTZ,
    decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(listing_id, applicant_identity_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_listing_stage
    ON public.looking_for_applications(listing_id, current_stage, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_applicant
    ON public.looking_for_applications(applicant_identity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_community
    ON public.looking_for_applications(community_id, current_stage);

DROP TRIGGER IF EXISTS trg_applications_updated ON public.looking_for_applications;
CREATE TRIGGER trg_applications_updated
BEFORE UPDATE ON public.looking_for_applications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────────────
-- 3. REVIEWER ASSIGNMENTS + NOTES
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.recruitment_reviewer_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.looking_for_applications(id) ON DELETE CASCADE,
    reviewer_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'REVIEWER',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    removed_at TIMESTAMPTZ,
    UNIQUE(application_id, reviewer_identity_id)
);

CREATE INDEX IF NOT EXISTS idx_reviewer_assign_reviewer
    ON public.recruitment_reviewer_assignments(reviewer_identity_id, assigned_at DESC);

CREATE TABLE IF NOT EXISTS public.recruitment_reviewer_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.looking_for_applications(id) ON DELETE CASCADE,
    author_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    visibility VARCHAR(30) NOT NULL DEFAULT 'TEAM',
    body TEXT NOT NULL,
    score INTEGER,
    tags TEXT[],
    metadata JSONB,
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviewer_notes_application
    ON public.recruitment_reviewer_notes(application_id, created_at DESC)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_reviewer_notes_updated ON public.recruitment_reviewer_notes;
CREATE TRIGGER trg_reviewer_notes_updated
BEFORE UPDATE ON public.recruitment_reviewer_notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────────────
-- 4. INTERVIEWS
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.recruitment_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.looking_for_applications(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.looking_for_listings(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    scheduled_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    meeting_url TEXT,
    location TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    cancellation_reason TEXT,
    completed_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_application
    ON public.recruitment_interviews(application_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_upcoming
    ON public.recruitment_interviews(scheduled_at)
    WHERE status = 'SCHEDULED';

DROP TRIGGER IF EXISTS trg_interviews_updated ON public.recruitment_interviews;
CREATE TRIGGER trg_interviews_updated
BEFORE UPDATE ON public.recruitment_interviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.recruitment_interview_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES public.recruitment_interviews(id) ON DELETE CASCADE,
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL DEFAULT 'INTERVIEWER',
    response_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(interview_id, identity_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_participants_identity
    ON public.recruitment_interview_participants(identity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.recruitment_interview_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES public.recruitment_interviews(id) ON DELETE CASCADE,
    reviewer_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation VARCHAR(30),
    score INTEGER,
    strengths TEXT,
    concerns TEXT,
    body TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(interview_id, reviewer_identity_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_feedback_interview
    ON public.recruitment_interview_feedback(interview_id);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 5. DECISIONS
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.recruitment_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.looking_for_applications(id) ON DELETE CASCADE,
    decided_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    decision_type VARCHAR(30) NOT NULL,
    reason TEXT,
    message_to_applicant TEXT,
    offer_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decisions_application
    ON public.recruitment_decisions(application_id, created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 6. RPCs
-- ────────────────────────────────────────────────────────────────────────────────────

-- Increment listing view_count safely
CREATE OR REPLACE FUNCTION public.rpc_listing_view(p_listing_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.looking_for_listings SET view_count = view_count + 1 WHERE id = p_listing_id;
END;
$$;

-- Increment application_count on new application (safely)
CREATE OR REPLACE FUNCTION public.rpc_bump_application_count(p_listing_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.looking_for_listings SET application_count = application_count + 1 WHERE id = p_listing_id;
END;
$$;

-- Move application through stages, updates bucket + workflow atomically
CREATE OR REPLACE FUNCTION public.rpc_advance_application_stage(
  p_application_id UUID,
  p_new_stage TEXT,
  p_actor_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_app RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_app FROM public.looking_for_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found' USING ERRCODE = '22023'; END IF;

  UPDATE public.looking_for_applications
     SET current_stage = p_new_stage,
         updated_at = v_now
   WHERE id = p_application_id;

  RETURN jsonb_build_object(
    'application_id', p_application_id,
    'previous_stage', v_app.current_stage,
    'new_stage', p_new_stage
  );
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────────────
-- 7. RLS
-- ────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.looking_for_listings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.looking_for_applications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_reviewer_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_reviewer_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_interviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_interview_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_interview_feedback      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_decisions               ENABLE ROW LEVEL SECURITY;

-- Listings: OPEN visible to everyone; owner + community admins see DRAFT/CLOSED
DROP POLICY IF EXISTS "listings_read" ON public.looking_for_listings;
CREATE POLICY "listings_read" ON public.looking_for_listings FOR SELECT USING (
  status = 'OPEN'
  OR owner_identity_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_memberships cm
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE cm.community_id = looking_for_listings.community_id
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER','ADMIN','MODERATOR')
  )
);

DROP POLICY IF EXISTS "listings_insert_admin" ON public.looking_for_listings;
CREATE POLICY "listings_insert_admin" ON public.looking_for_listings FOR INSERT
  WITH CHECK (
    owner_identity_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_memberships cm
      JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
      JOIN public.community_roles cr ON cr.id = mr.role_id
      WHERE cm.community_id = looking_for_listings.community_id
        AND cm.identity_id = auth.uid()
        AND cr.role_key IN ('OWNER','ADMIN')
    )
  );

DROP POLICY IF EXISTS "listings_update_owner" ON public.looking_for_listings;
CREATE POLICY "listings_update_owner" ON public.looking_for_listings FOR UPDATE USING (
  owner_identity_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_memberships cm
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE cm.community_id = looking_for_listings.community_id
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER','ADMIN')
  )
);

-- Applications: applicant sees own; community admins/moderators + assigned reviewers see all
DROP POLICY IF EXISTS "applications_read" ON public.looking_for_applications;
CREATE POLICY "applications_read" ON public.looking_for_applications FOR SELECT USING (
  applicant_identity_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_memberships cm
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE cm.community_id = looking_for_applications.community_id
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER','ADMIN','MODERATOR')
  )
  OR EXISTS (
    SELECT 1 FROM public.recruitment_reviewer_assignments ra
    WHERE ra.application_id = looking_for_applications.id
      AND ra.reviewer_identity_id = auth.uid()
      AND ra.removed_at IS NULL
  )
);

DROP POLICY IF EXISTS "applications_insert_self" ON public.looking_for_applications;
CREATE POLICY "applications_insert_self" ON public.looking_for_applications FOR INSERT
  WITH CHECK (applicant_identity_id = auth.uid());

DROP POLICY IF EXISTS "applications_update_own_or_admin" ON public.looking_for_applications;
CREATE POLICY "applications_update_own_or_admin" ON public.looking_for_applications FOR UPDATE USING (
  applicant_identity_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_memberships cm
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE cm.community_id = looking_for_applications.community_id
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER','ADMIN')
  )
);

-- Reviewer notes: PRIVATE = author only; TEAM = community admins + reviewers; SYSTEM = all who can view application
DROP POLICY IF EXISTS "reviewer_notes_read" ON public.recruitment_reviewer_notes;
CREATE POLICY "reviewer_notes_read" ON public.recruitment_reviewer_notes FOR SELECT USING (
  deleted_at IS NULL
  AND (
    visibility = 'SYSTEM'
    OR author_identity_id = auth.uid()
    OR (
      visibility = 'TEAM'
      AND EXISTS (
        SELECT 1 FROM public.looking_for_applications a
        JOIN public.community_memberships cm ON cm.community_id = a.community_id
        JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
        JOIN public.community_roles cr ON cr.id = mr.role_id
        WHERE a.id = recruitment_reviewer_notes.application_id
          AND cm.identity_id = auth.uid()
          AND cr.role_key IN ('OWNER','ADMIN','MODERATOR')
      )
    )
    OR (
      visibility = 'TEAM'
      AND EXISTS (
        SELECT 1 FROM public.recruitment_reviewer_assignments ra
        WHERE ra.application_id = recruitment_reviewer_notes.application_id
          AND ra.reviewer_identity_id = auth.uid()
          AND ra.removed_at IS NULL
      )
    )
  )
);

DROP POLICY IF EXISTS "reviewer_notes_insert_author" ON public.recruitment_reviewer_notes;
CREATE POLICY "reviewer_notes_insert_author" ON public.recruitment_reviewer_notes FOR INSERT
  WITH CHECK (author_identity_id = auth.uid());

DROP POLICY IF EXISTS "reviewer_notes_update_author" ON public.recruitment_reviewer_notes;
CREATE POLICY "reviewer_notes_update_author" ON public.recruitment_reviewer_notes FOR UPDATE
  USING (author_identity_id = auth.uid());

-- Reviewer assignments
DROP POLICY IF EXISTS "reviewer_assign_read" ON public.recruitment_reviewer_assignments;
CREATE POLICY "reviewer_assign_read" ON public.recruitment_reviewer_assignments FOR SELECT USING (
  reviewer_identity_id = auth.uid()
  OR assigned_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.looking_for_applications a
    JOIN public.community_memberships cm ON cm.community_id = a.community_id
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE a.id = recruitment_reviewer_assignments.application_id
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER','ADMIN')
  )
);

-- Interviews
DROP POLICY IF EXISTS "interviews_read" ON public.recruitment_interviews;
CREATE POLICY "interviews_read" ON public.recruitment_interviews FOR SELECT USING (
  scheduled_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.recruitment_interview_participants p
    WHERE p.interview_id = recruitment_interviews.id AND p.identity_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.looking_for_applications a
    WHERE a.id = recruitment_interviews.application_id AND a.applicant_identity_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.community_memberships cm
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE cm.community_id = recruitment_interviews.community_id
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER','ADMIN')
  )
);

DROP POLICY IF EXISTS "interview_participants_read" ON public.recruitment_interview_participants;
CREATE POLICY "interview_participants_read" ON public.recruitment_interview_participants FOR SELECT USING (
  identity_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.recruitment_interviews i
    WHERE i.id = recruitment_interview_participants.interview_id AND i.scheduled_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "interview_participants_self_response" ON public.recruitment_interview_participants;
CREATE POLICY "interview_participants_self_response" ON public.recruitment_interview_participants FOR UPDATE
  USING (identity_id = auth.uid());

DROP POLICY IF EXISTS "interview_feedback_read" ON public.recruitment_interview_feedback;
CREATE POLICY "interview_feedback_read" ON public.recruitment_interview_feedback FOR SELECT USING (
  reviewer_identity_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.recruitment_interviews i
    JOIN public.looking_for_applications a ON a.id = i.application_id
    JOIN public.community_memberships cm ON cm.community_id = a.community_id
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE i.id = recruitment_interview_feedback.interview_id
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER','ADMIN')
  )
);

DROP POLICY IF EXISTS "interview_feedback_insert_reviewer" ON public.recruitment_interview_feedback;
CREATE POLICY "interview_feedback_insert_reviewer" ON public.recruitment_interview_feedback FOR INSERT
  WITH CHECK (reviewer_identity_id = auth.uid());

DROP POLICY IF EXISTS "decisions_read" ON public.recruitment_decisions;
CREATE POLICY "decisions_read" ON public.recruitment_decisions FOR SELECT USING (
  decided_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.looking_for_applications a
    WHERE a.id = recruitment_decisions.application_id
      AND (
        a.applicant_identity_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.community_memberships cm
          JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
          JOIN public.community_roles cr ON cr.id = mr.role_id
          WHERE cm.community_id = a.community_id
            AND cm.identity_id = auth.uid()
            AND cr.role_key IN ('OWNER','ADMIN')
        )
      )
  )
);

-- Realtime for applications + interviews (kanban + scheduler live updates)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'looking_for_applications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.looking_for_applications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'recruitment_interviews') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.recruitment_interviews;
  END IF;
END $$;