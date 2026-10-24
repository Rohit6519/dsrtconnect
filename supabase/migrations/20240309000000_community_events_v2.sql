-- ====================================================================================
-- PHASE 13: COMMUNITY EVENTS V2 — Studio + Registration + Waitlist + Check-in + Attendance
-- Fully idempotent. Backward-compatible with legacy community_events.
-- ====================================================================================

-- ────────────────────────────────────────────────────────────────────────────────────
-- 1. EVENTS V2
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_events_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    legacy_event_id UUID REFERENCES public.community_events(id) ON DELETE SET NULL,
    owner_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slug VARCHAR(120) NOT NULL,
    public_id VARCHAR(30) NOT NULL,
    title VARCHAR(300) NOT NULL,
    tagline VARCHAR(300),
    description TEXT,
    event_type VARCHAR(40) NOT NULL DEFAULT 'GENERAL',
    cover_file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
    cover_url TEXT,
    banner_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    is_online BOOLEAN NOT NULL DEFAULT true,
    location_text TEXT,
    location_coords JSONB,
    meeting_url TEXT,
    timezone VARCHAR(60) NOT NULL DEFAULT 'UTC',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    registration_opens_at TIMESTAMPTZ,
    registration_closes_at TIMESTAMPTZ,
    registration_form_id UUID REFERENCES public.operations_forms(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    metadata JSONB,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_events_v2_slug_per_community
    ON public.community_events_v2(community_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS uq_events_v2_public_id ON public.community_events_v2(public_id);

CREATE INDEX IF NOT EXISTS idx_events_v2_community_status
    ON public.community_events_v2(community_id, status, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_v2_upcoming
    ON public.community_events_v2(status, starts_at)
    WHERE status IN ('SCHEDULED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'LIVE');
CREATE INDEX IF NOT EXISTS idx_events_v2_owner
    ON public.community_events_v2(owner_identity_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_events_v2_updated ON public.community_events_v2;
CREATE TRIGGER trg_events_v2_updated
BEFORE UPDATE ON public.community_events_v2
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-fill public_id on insert
CREATE OR REPLACE FUNCTION public.gen_event_public_id() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := 'EVT-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 10));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_v2_public_id ON public.community_events_v2;
CREATE TRIGGER trg_events_v2_public_id
BEFORE INSERT ON public.community_events_v2
FOR EACH ROW EXECUTE FUNCTION public.gen_event_public_id();

-- ────────────────────────────────────────────────────────────────────────────────────
-- 2. REGISTRATION CONFIG
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_event_registration_config (
    event_id UUID PRIMARY KEY REFERENCES public.community_events_v2(id) ON DELETE CASCADE,
    registration_mode VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    capacity INTEGER,
    waitlist_enabled BOOLEAN NOT NULL DEFAULT true,
    waitlist_capacity INTEGER,
    require_approval BOOLEAN NOT NULL DEFAULT false,
    allow_guests BOOLEAN NOT NULL DEFAULT false,
    members_only BOOLEAN NOT NULL DEFAULT false,
    confirmed_count INTEGER NOT NULL DEFAULT 0,
    waitlist_count INTEGER NOT NULL DEFAULT 0,
    cancelled_count INTEGER NOT NULL DEFAULT 0,
    checkin_enabled BOOLEAN NOT NULL DEFAULT true,
    checkin_opens_before_minutes INTEGER NOT NULL DEFAULT 30,
    reminder_offsets JSONB DEFAULT '[{"hours": 24}, {"hours": 1}]'::jsonb,
    metadata JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_reg_config_updated ON public.community_event_registration_config;
CREATE TRIGGER trg_reg_config_updated
BEFORE UPDATE ON public.community_event_registration_config
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────────────
-- 3. REGISTRATIONS
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.community_events_v2(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    form_submission_id UUID REFERENCES public.operations_form_submissions(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    registration_number VARCHAR(30),
    priority INTEGER NOT NULL DEFAULT 100,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    waitlisted_at TIMESTAMPTZ,
    promoted_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    guests_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_registrations_event_identity
    ON public.community_event_registrations(event_id, identity_id)
    WHERE status NOT IN ('CANCELLED', 'REMOVED');

CREATE INDEX IF NOT EXISTS idx_registrations_event_status
    ON public.community_event_registrations(event_id, status, registered_at ASC);
CREATE INDEX IF NOT EXISTS idx_registrations_identity
    ON public.community_event_registrations(identity_id, registered_at DESC);

DROP TRIGGER IF EXISTS trg_registrations_updated ON public.community_event_registrations;
CREATE TRIGGER trg_registrations_updated
BEFORE UPDATE ON public.community_event_registrations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────────────
-- 4. WAITLIST ENTRIES
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_event_waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.community_events_v2(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES public.community_event_registrations(id) ON DELETE CASCADE,
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    priority INTEGER NOT NULL DEFAULT 100,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    offered_at TIMESTAMPTZ,
    offer_expires_at TIMESTAMPTZ,
    promoted_at TIMESTAMPTZ,
    removed_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_waitlist_event_reg
    ON public.community_event_waitlist_entries(event_id, registration_id);

CREATE INDEX IF NOT EXISTS idx_waitlist_event_active
    ON public.community_event_waitlist_entries(event_id, priority ASC, joined_at ASC, id ASC)
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_waitlist_offer_expiry
    ON public.community_event_waitlist_entries(offer_expires_at)
    WHERE status = 'OFFERED';

-- ────────────────────────────────────────────────────────────────────────────────────
-- 5. CHECK-IN TOKENS
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_event_checkin_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.community_events_v2(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES public.community_event_registrations(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    token_preview VARCHAR(20),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    first_used_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    use_count INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_checkin_tokens_hash
    ON public.community_event_checkin_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_checkin_tokens_reg
    ON public.community_event_checkin_tokens(registration_id);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 6. ATTENDANCE
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_event_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.community_events_v2(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES public.community_event_registrations(id) ON DELETE CASCADE,
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'CHECKED_IN',
    checkin_method VARCHAR(30) NOT NULL DEFAULT 'QR',
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checked_out_at TIMESTAMPTZ,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    device_id VARCHAR(120),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_registration
    ON public.community_event_attendance(registration_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event
    ON public.community_event_attendance(event_id, checked_in_at DESC);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 7. REMINDER SCHEDULE
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_event_reminders_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.community_events_v2(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    reminder_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    dispatched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_pending
    ON public.community_event_reminders_schedule(scheduled_for, status)
    WHERE status = 'PENDING';

-- ────────────────────────────────────────────────────────────────────────────────────
-- 8. CONCURRENCY-SAFE RPCs
-- ────────────────────────────────────────────────────────────────────────────────────

-- Atomic registration: locks event config, decides CONFIRMED vs WAITLISTED
CREATE OR REPLACE FUNCTION public.rpc_event_register(
  p_event_id UUID,
  p_identity_id UUID,
  p_form_submission_id UUID DEFAULT NULL,
  p_guests INTEGER DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event RECORD;
  v_config RECORD;
  v_existing RECORD;
  v_registration_id UUID;
  v_number TEXT;
  v_status TEXT;
  v_position INTEGER;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_event FROM public.community_events_v2 WHERE id = p_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found' USING ERRCODE = '22023'; END IF;
  IF v_event.status = 'CANCELLED' THEN RAISE EXCEPTION 'Event cancelled' USING ERRCODE = '22023'; END IF;
  IF v_event.status NOT IN ('REGISTRATION_OPEN','SCHEDULED') THEN
    RAISE EXCEPTION 'Registration not open (status=%)', v_event.status USING ERRCODE = '22023';
  END IF;
  IF v_event.registration_closes_at IS NOT NULL AND v_event.registration_closes_at < v_now THEN
    RAISE EXCEPTION 'Registration closed' USING ERRCODE = '22023';
  END IF;

  -- Lock the config row
  SELECT * INTO v_config FROM public.community_event_registration_config
    WHERE event_id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Registration config missing' USING ERRCODE = '22023'; END IF;

  -- Reuse existing active registration
  SELECT * INTO v_existing FROM public.community_event_registrations
    WHERE event_id = p_event_id AND identity_id = p_identity_id
      AND status NOT IN ('CANCELLED','REMOVED')
    LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('registration_id', v_existing.id, 'status', v_existing.status, 'already_registered', true);
  END IF;

  -- Decide CONFIRMED vs WAITLISTED
  IF v_config.capacity IS NULL OR v_config.confirmed_count < v_config.capacity THEN
    v_status := 'CONFIRMED';
    v_number := 'REG-' || LPAD((v_config.confirmed_count + 1)::text, 6, '0');
    INSERT INTO public.community_event_registrations
      (event_id, community_id, identity_id, form_submission_id, status, registration_number, guests_count, confirmed_at)
      VALUES (p_event_id, v_event.community_id, p_identity_id, p_form_submission_id, 'CONFIRMED', v_number, p_guests, v_now)
      RETURNING id INTO v_registration_id;

    UPDATE public.community_event_registration_config
      SET confirmed_count = confirmed_count + 1
      WHERE event_id = p_event_id;
  ELSIF v_config.waitlist_enabled AND (v_config.waitlist_capacity IS NULL OR v_config.waitlist_count < v_config.waitlist_capacity) THEN
    v_status := 'WAITLISTED';
    INSERT INTO public.community_event_registrations
      (event_id, community_id, identity_id, form_submission_id, status, guests_count, waitlisted_at)
      VALUES (p_event_id, v_event.community_id, p_identity_id, p_form_submission_id, 'WAITLISTED', p_guests, v_now)
      RETURNING id INTO v_registration_id;

    v_position := v_config.waitlist_count + 1;
    INSERT INTO public.community_event_waitlist_entries
      (event_id, registration_id, identity_id, position, joined_at)
      VALUES (p_event_id, v_registration_id, p_identity_id, v_position, v_now);

    UPDATE public.community_event_registration_config
      SET waitlist_count = waitlist_count + 1
      WHERE event_id = p_event_id;
  ELSE
    RAISE EXCEPTION 'Event is full (no waitlist available)' USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object(
    'registration_id', v_registration_id,
    'status', v_status,
    'registration_number', v_number,
    'waitlist_position', v_position
  );
END;
$$;

-- Cancel registration (releases seat + optionally auto-promotes)
CREATE OR REPLACE FUNCTION public.rpc_event_cancel_registration(
  p_registration_id UUID,
  p_actor_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reg RECORD;
  v_config RECORD;
  v_promoted UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_reg FROM public.community_event_registrations WHERE id = p_registration_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Registration not found' USING ERRCODE = '22023'; END IF;
  IF v_reg.status IN ('CANCELLED','REMOVED') THEN
    RETURN jsonb_build_object('already_cancelled', true);
  END IF;

  SELECT * INTO v_config FROM public.community_event_registration_config
    WHERE event_id = v_reg.event_id FOR UPDATE;

  UPDATE public.community_event_registrations
    SET status = 'CANCELLED', cancelled_at = v_now, cancellation_reason = p_reason
    WHERE id = p_registration_id;

  IF v_reg.status = 'CONFIRMED' THEN
    UPDATE public.community_event_registration_config
      SET confirmed_count = GREATEST(0, confirmed_count - 1),
          cancelled_count = cancelled_count + 1
      WHERE event_id = v_reg.event_id;
  ELSIF v_reg.status = 'WAITLISTED' THEN
    UPDATE public.community_event_waitlist_entries
      SET status = 'REMOVED', removed_at = v_now
      WHERE registration_id = p_registration_id AND status = 'ACTIVE';
    UPDATE public.community_event_registration_config
      SET waitlist_count = GREATEST(0, waitlist_count - 1)
      WHERE event_id = v_reg.event_id;
  END IF;

  -- Try to auto-promote from waitlist if a seat opened
  IF v_reg.status = 'CONFIRMED' AND v_config.waitlist_enabled THEN
    SELECT registration_id INTO v_promoted FROM public.community_event_waitlist_entries
      WHERE event_id = v_reg.event_id AND status = 'ACTIVE'
      ORDER BY priority ASC, joined_at ASC, id ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
    IF v_promoted IS NOT NULL THEN
      -- Mark waitlist entry OFFERED (12h window)
      UPDATE public.community_event_waitlist_entries
        SET status = 'OFFERED', offered_at = v_now, offer_expires_at = v_now + interval '12 hours'
        WHERE registration_id = v_promoted;
    END IF;
  END IF;

  RETURN jsonb_build_object('cancelled', true, 'promoted_registration_id', v_promoted);
END;
$$;

-- Explicitly promote a waitlisted registration (used by worker + admin)
CREATE OR REPLACE FUNCTION public.rpc_event_promote_waitlist(
  p_registration_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reg RECORD;
  v_number TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_reg FROM public.community_event_registrations WHERE id = p_registration_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Registration not found' USING ERRCODE = '22023'; END IF;
  IF v_reg.status <> 'WAITLISTED' THEN
    RAISE EXCEPTION 'Registration is not waitlisted' USING ERRCODE = '22023';
  END IF;

  SELECT 'REG-' || LPAD((confirmed_count + 1)::text, 6, '0') INTO v_number
    FROM public.community_event_registration_config
    WHERE event_id = v_reg.event_id
    FOR UPDATE;

  UPDATE public.community_event_registrations
    SET status = 'CONFIRMED', confirmed_at = v_now, promoted_at = v_now, registration_number = v_number
    WHERE id = p_registration_id;

  UPDATE public.community_event_waitlist_entries
    SET status = 'PROMOTED', promoted_at = v_now
    WHERE registration_id = p_registration_id;

  UPDATE public.community_event_registration_config
    SET confirmed_count = confirmed_count + 1,
        waitlist_count = GREATEST(0, waitlist_count - 1)
    WHERE event_id = v_reg.event_id;

  RETURN jsonb_build_object('promoted', true, 'registration_number', v_number);
END;
$$;

-- Atomic + replay-safe check-in
CREATE OR REPLACE FUNCTION public.rpc_event_checkin(
  p_token_hash TEXT,
  p_recorded_by UUID DEFAULT NULL,
  p_device_id TEXT DEFAULT NULL,
  p_method TEXT DEFAULT 'QR'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token RECORD;
  v_reg RECORD;
  v_event RECORD;
  v_existing RECORD;
  v_attendance_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_token FROM public.community_event_checkin_tokens WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid check-in token' USING ERRCODE = '22023'; END IF;
  IF v_token.expires_at IS NOT NULL AND v_token.expires_at < v_now THEN
    RAISE EXCEPTION 'Check-in token expired' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_reg FROM public.community_event_registrations WHERE id = v_token.registration_id;
  IF v_reg.status <> 'CONFIRMED' THEN
    RAISE EXCEPTION 'Registration is not confirmed (%)', v_reg.status USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_event FROM public.community_events_v2 WHERE id = v_reg.event_id;
  IF v_event.status = 'CANCELLED' THEN RAISE EXCEPTION 'Event cancelled' USING ERRCODE = '22023'; END IF;

  -- Idempotent replay
  SELECT * INTO v_existing FROM public.community_event_attendance WHERE registration_id = v_reg.id;
  IF FOUND THEN
    UPDATE public.community_event_checkin_tokens
      SET last_used_at = v_now, use_count = use_count + 1
      WHERE id = v_token.id;
    RETURN jsonb_build_object(
      'attendance_id', v_existing.id,
      'already_checked_in', true,
      'checked_in_at', v_existing.checked_in_at,
      'registration_number', v_reg.registration_number
    );
  END IF;

  INSERT INTO public.community_event_attendance
    (event_id, registration_id, identity_id, status, checkin_method, checked_in_at, recorded_by, device_id)
    VALUES (v_reg.event_id, v_reg.id, v_reg.identity_id, 'CHECKED_IN', p_method, v_now, p_recorded_by, p_device_id)
    RETURNING id INTO v_attendance_id;

  UPDATE public.community_event_checkin_tokens
    SET first_used_at = COALESCE(first_used_at, v_now),
        last_used_at = v_now,
        use_count = use_count + 1
    WHERE id = v_token.id;

  RETURN jsonb_build_object(
    'attendance_id', v_attendance_id,
    'registration_id', v_reg.id,
    'registration_number', v_reg.registration_number,
    'already_checked_in', false
  );
END;
$$;

-- Close registration state
CREATE OR REPLACE FUNCTION public.rpc_event_close_registration(p_event_id UUID) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.community_events_v2
    SET status = 'REGISTRATION_CLOSED'
    WHERE id = p_event_id AND status = 'REGISTRATION_OPEN';
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────────────
-- 9. RLS
-- ────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.community_events_v2                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_event_registration_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_event_registrations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_event_waitlist_entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_event_checkin_tokens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_event_attendance                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_event_reminders_schedule        ENABLE ROW LEVEL SECURITY;

-- Events: PUBLIC + published visible to all; DRAFT only to owner + admins
DROP POLICY IF EXISTS "events_v2_read" ON public.community_events_v2;
CREATE POLICY "events_v2_read" ON public.community_events_v2 FOR SELECT USING (
  status IN ('SCHEDULED','REGISTRATION_OPEN','REGISTRATION_CLOSED','LIVE','ENDED','ARCHIVED')
  OR owner_identity_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_memberships cm
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE cm.community_id = community_events_v2.community_id
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER','ADMIN','MODERATOR')
  )
);

DROP POLICY IF EXISTS "events_v2_insert_admin" ON public.community_events_v2;
CREATE POLICY "events_v2_insert_admin" ON public.community_events_v2 FOR INSERT
  WITH CHECK (
    owner_identity_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_memberships cm
      JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
      JOIN public.community_roles cr ON cr.id = mr.role_id
      WHERE cm.community_id = community_events_v2.community_id
        AND cm.identity_id = auth.uid()
        AND cr.role_key IN ('OWNER','ADMIN')
    )
  );

DROP POLICY IF EXISTS "events_v2_update_owner_admin" ON public.community_events_v2;
CREATE POLICY "events_v2_update_owner_admin" ON public.community_events_v2 FOR UPDATE
  USING (
    owner_identity_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_memberships cm
      JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
      JOIN public.community_roles cr ON cr.id = mr.role_id
      WHERE cm.community_id = community_events_v2.community_id
        AND cm.identity_id = auth.uid()
        AND cr.role_key IN ('OWNER','ADMIN')
    )
  );

-- Config: readable if event visible
DROP POLICY IF EXISTS "reg_config_read" ON public.community_event_registration_config;
CREATE POLICY "reg_config_read" ON public.community_event_registration_config FOR SELECT USING (true);

-- Registrations: registrant sees own; admins see all
DROP POLICY IF EXISTS "registrations_read" ON public.community_event_registrations;
CREATE POLICY "registrations_read" ON public.community_event_registrations FOR SELECT USING (
  identity_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_memberships cm
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE cm.community_id = community_event_registrations.community_id
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER','ADMIN','MODERATOR')
  )
);

DROP POLICY IF EXISTS "waitlist_read" ON public.community_event_waitlist_entries;
CREATE POLICY "waitlist_read" ON public.community_event_waitlist_entries FOR SELECT USING (
  identity_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_event_registrations r
    WHERE r.id = community_event_waitlist_entries.registration_id
      AND EXISTS (
        SELECT 1 FROM public.community_memberships cm
        JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
        JOIN public.community_roles cr ON cr.id = mr.role_id
        WHERE cm.community_id = r.community_id
          AND cm.identity_id = auth.uid()
          AND cr.role_key IN ('OWNER','ADMIN','MODERATOR')
      )
  )
);

-- Check-in tokens — user reads own via registration; scanner uses service role via RPC
DROP POLICY IF EXISTS "checkin_tokens_read_own" ON public.community_event_checkin_tokens;
CREATE POLICY "checkin_tokens_read_own" ON public.community_event_checkin_tokens FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.community_event_registrations r
    WHERE r.id = community_event_checkin_tokens.registration_id
      AND r.identity_id = auth.uid()
  )
);

-- Attendance: user sees own; admins see all
DROP POLICY IF EXISTS "attendance_read" ON public.community_event_attendance;
CREATE POLICY "attendance_read" ON public.community_event_attendance FOR SELECT USING (
  identity_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_memberships cm
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE cm.community_id = (SELECT community_id FROM public.community_events_v2 e WHERE e.id = community_event_attendance.event_id)
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER','ADMIN','MODERATOR')
  )
);

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_event_registrations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_event_registrations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_event_registration_config') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_event_registration_config;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_event_attendance') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_event_attendance;
  END IF;
END $$;