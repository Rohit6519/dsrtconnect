-- ====================================================================================
-- PHASE 13: COMMUNITY EVENTS
-- Fully idempotent. Uses Operations Engine (forms + workflows + buckets).
-- ====================================================================================

-- ────────────────────────────────────────────────────────────────────────────────────
-- 1. EVENTS
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    owner_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    public_id VARCHAR(64),
    slug VARCHAR(120) NOT NULL,
    title VARCHAR(300) NOT NULL,
    tagline VARCHAR(400),
    description TEXT,
    event_type VARCHAR(40) NOT NULL DEFAULT 'general',
    category VARCHAR(60),
    cover_file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
    cover_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    visibility VARCHAR(30) NOT NULL DEFAULT 'COMMUNITY',
    is_online BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    registration_form_id UUID REFERENCES public.operations_forms(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE(community_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_events_community ON public.event_events(community_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_public_id ON public.event_events(public_id) WHERE public_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_owner ON public.event_events(owner_identity_id);

DROP TRIGGER IF EXISTS trg_events_updated ON public.event_events;
CREATE TRIGGER trg_events_updated
BEFORE UPDATE ON public.event_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-generate public_id
CREATE OR REPLACE FUNCTION public.set_event_public_id() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := 'EVT-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_public_id ON public.event_events;
CREATE TRIGGER trg_events_public_id
BEFORE INSERT ON public.event_events
FOR EACH ROW EXECUTE FUNCTION public.set_event_public_id();

-- ────────────────────────────────────────────────────────────────────────────────────
-- 2. SCHEDULES & LOCATIONS
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.event_events(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    timezone VARCHAR(60) NOT NULL DEFAULT 'UTC',
    is_primary BOOLEAN NOT NULL DEFAULT true,
    label VARCHAR(120),
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_schedules_event ON public.event_schedules(event_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_schedules_upcoming ON public.event_schedules(starts_at) WHERE starts_at > NOW();

CREATE TABLE IF NOT EXISTS public.event_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.event_events(id) ON DELETE CASCADE,
    location_type VARCHAR(30) NOT NULL DEFAULT 'PHYSICAL',
    name VARCHAR(200),
    address TEXT,
    city VARCHAR(120),
    country VARCHAR(60),
    latitude NUMERIC,
    longitude NUMERIC,
    meeting_url TEXT,
    dial_in_info TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_event ON public.event_locations(event_id);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 3. REGISTRATION CONFIG + ELIGIBILITY
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_registration_config (
    event_id UUID PRIMARY KEY REFERENCES public.event_events(id) ON DELETE CASCADE,
    registration_mode VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    capacity INTEGER,
    confirmed_count INTEGER NOT NULL DEFAULT 0,
    waitlist_count INTEGER NOT NULL DEFAULT 0,
    allow_waitlist BOOLEAN NOT NULL DEFAULT true,
    waitlist_offer_hours INTEGER NOT NULL DEFAULT 12,
    registration_opens_at TIMESTAMPTZ,
    registration_closes_at TIMESTAMPTZ,
    allow_cancellation BOOLEAN NOT NULL DEFAULT true,
    cancellation_deadline TIMESTAMPTZ,
    show_attendee_list BOOLEAN NOT NULL DEFAULT false,
    require_form_submission BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_reg_config_updated ON public.event_registration_config;
CREATE TRIGGER trg_reg_config_updated
BEFORE UPDATE ON public.event_registration_config
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.event_eligibility_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.event_events(id) ON DELETE CASCADE,
    rule_type VARCHAR(40) NOT NULL,
    rule_value JSONB,
    error_message TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eligibility_event ON public.event_eligibility_rules(event_id, position);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 4. REGISTRATIONS
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS event_registration_number_seq;

CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.event_events(id) ON DELETE CASCADE,
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    form_submission_id UUID REFERENCES public.operations_form_submissions(id) ON DELETE SET NULL,
    registration_number VARCHAR(30),
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED',
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, identity_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_event_status
    ON public.event_registrations(event_id, status, registered_at);
CREATE INDEX IF NOT EXISTS idx_registrations_identity
    ON public.event_registrations(identity_id, registered_at DESC);
CREATE INDEX IF NOT EXISTS idx_registrations_number
    ON public.event_registrations(registration_number) WHERE registration_number IS NOT NULL;

DROP TRIGGER IF EXISTS trg_registrations_updated ON public.event_registrations;
CREATE TRIGGER trg_registrations_updated
BEFORE UPDATE ON public.event_registrations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────────────
-- 5. WAITLIST
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.event_events(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    priority INTEGER NOT NULL DEFAULT 100,
    status VARCHAR(30) NOT NULL DEFAULT 'WAITING',
    offered_at TIMESTAMPTZ,
    offer_expires_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, registration_id)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_event_position
    ON public.event_waitlist_entries(event_id, priority ASC, joined_at ASC, id ASC)
    WHERE status = 'WAITING';
CREATE INDEX IF NOT EXISTS idx_waitlist_offer_expiry
    ON public.event_waitlist_entries(offer_expires_at) WHERE status = 'OFFERED';

DROP TRIGGER IF EXISTS trg_waitlist_updated ON public.event_waitlist_entries;
CREATE TRIGGER trg_waitlist_updated
BEFORE UPDATE ON public.event_waitlist_entries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────────────
-- 6. CHECK-IN TOKENS + ATTENDANCE
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_checkin_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.event_events(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    token_preview VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    UNIQUE(registration_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_checkin_token_hash ON public.event_checkin_tokens(token_hash);

CREATE TABLE IF NOT EXISTS public.event_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.event_events(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'CHECKED_IN',
    checkin_method VARCHAR(30) NOT NULL DEFAULT 'QR',
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checked_out_at TIMESTAMPTZ,
    checkin_count INTEGER NOT NULL DEFAULT 1,
    last_scan_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    device_id VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(registration_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_event_status
    ON public.event_attendance(event_id, status, checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_identity
    ON public.event_attendance(identity_id);

DROP TRIGGER IF EXISTS trg_attendance_updated ON public.event_attendance;
CREATE TRIGGER trg_attendance_updated
BEFORE UPDATE ON public.event_attendance
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────────────
-- 7. REMINDERS
-- ────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_reminders_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.event_events(id) ON DELETE CASCADE,
    reminder_key VARCHAR(60) NOT NULL,
    offset_minutes INTEGER NOT NULL,
    title_template TEXT,
    body_template TEXT,
    channel VARCHAR(30) NOT NULL DEFAULT 'IN_APP',
    scheduled_for TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, reminder_key)
);

CREATE INDEX IF NOT EXISTS idx_reminders_due
    ON public.event_reminders_schedule(status, scheduled_for)
    WHERE status = 'PENDING';

DROP TRIGGER IF EXISTS trg_reminders_updated ON public.event_reminders_schedule;
CREATE TRIGGER trg_reminders_updated
BEFORE UPDATE ON public.event_reminders_schedule
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────────────
-- 8. CONCURRENCY-SAFE RPCs
-- ────────────────────────────────────────────────────────────────────────────────────

-- Atomic register — locks registration_config row, decides CONFIRMED vs WAITLISTED
CREATE OR REPLACE FUNCTION public.rpc_event_register(
  p_event_id UUID,
  p_identity_id UUID,
  p_form_submission_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event RECORD;
  v_config RECORD;
  v_existing RECORD;
  v_reg_id UUID;
  v_reg_number TEXT;
  v_target_status TEXT;
  v_waitlist_pos INTEGER;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_event FROM public.event_events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found' USING ERRCODE = '22023';
  END IF;

  IF v_event.status <> 'PUBLISHED' THEN
    RAISE EXCEPTION 'Event is not open for registration' USING ERRCODE = '22023';
  END IF;

  -- Lock config row
  SELECT * INTO v_config FROM public.event_registration_config WHERE event_id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event registration not configured' USING ERRCODE = '22023';
  END IF;

  IF v_config.registration_mode = 'CLOSED' THEN
    RAISE EXCEPTION 'Registration is closed' USING ERRCODE = '22023';
  END IF;

  IF v_config.registration_opens_at IS NOT NULL AND v_now < v_config.registration_opens_at THEN
    RAISE EXCEPTION 'Registration has not opened yet' USING ERRCODE = '22023';
  END IF;

  IF v_config.registration_closes_at IS NOT NULL AND v_now > v_config.registration_closes_at THEN
    RAISE EXCEPTION 'Registration deadline has passed' USING ERRCODE = '22023';
  END IF;

  -- Check for existing registration
  SELECT * INTO v_existing FROM public.event_registrations
    WHERE event_id = p_event_id AND identity_id = p_identity_id;

  IF FOUND THEN
    IF v_existing.status IN ('CONFIRMED', 'WAITLISTED', 'ATTENDED') THEN
      RETURN jsonb_build_object(
        'registration_id', v_existing.id,
        'status', v_existing.status,
        'already_registered', true
      );
    END IF;

    -- Reactivate cancelled
    IF v_existing.status IN ('CANCELLED', 'NO_SHOW') THEN
      DELETE FROM public.event_registrations WHERE id = v_existing.id;
    END IF;
  END IF;

  -- Decide status
  IF v_config.capacity IS NULL OR v_config.confirmed_count < v_config.capacity THEN
    v_target_status := 'CONFIRMED';
    UPDATE public.event_registration_config
       SET confirmed_count = confirmed_count + 1
     WHERE event_id = p_event_id;
    v_reg_number := 'REG-' || LPAD(nextval('event_registration_number_seq')::TEXT, 6, '0');
  ELSIF v_config.allow_waitlist THEN
    v_target_status := 'WAITLISTED';
    UPDATE public.event_registration_config
       SET waitlist_count = waitlist_count + 1
     WHERE event_id = p_event_id;
  ELSE
    RAISE EXCEPTION 'Event is full and waitlist disabled' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.event_registrations
    (event_id, identity_id, form_submission_id, registration_number, status, confirmed_at)
  VALUES
    (p_event_id, p_identity_id, p_form_submission_id, v_reg_number,
     v_target_status, CASE WHEN v_target_status = 'CONFIRMED' THEN v_now ELSE NULL END)
  RETURNING id INTO v_reg_id;

  IF v_target_status = 'WAITLISTED' THEN
    SELECT COALESCE(MAX(position), 0) + 1 INTO v_waitlist_pos
      FROM public.event_waitlist_entries WHERE event_id = p_event_id;
    INSERT INTO public.event_waitlist_entries (event_id, registration_id, identity_id, position)
    VALUES (p_event_id, v_reg_id, p_identity_id, v_waitlist_pos);
  END IF;

  RETURN jsonb_build_object(
    'registration_id', v_reg_id,
    'status', v_target_status,
    'registration_number', v_reg_number,
    'waitlist_position', v_waitlist_pos
  );
END;
$$;

-- Cancel registration, free the seat, promote next waitlist entry inline
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
  v_freed_seat BOOLEAN := false;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_reg FROM public.event_registrations WHERE id = p_registration_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found' USING ERRCODE = '22023';
  END IF;

  IF v_reg.status = 'CANCELLED' THEN
    RETURN jsonb_build_object('already_cancelled', true);
  END IF;

  SELECT * INTO v_config FROM public.event_registration_config WHERE event_id = v_reg.event_id FOR UPDATE;

  IF v_reg.status = 'CONFIRMED' THEN
    UPDATE public.event_registration_config
       SET confirmed_count = GREATEST(0, confirmed_count - 1)
     WHERE event_id = v_reg.event_id;
    v_freed_seat := true;
  ELSIF v_reg.status = 'WAITLISTED' THEN
    UPDATE public.event_registration_config
       SET waitlist_count = GREATEST(0, waitlist_count - 1)
     WHERE event_id = v_reg.event_id;
    UPDATE public.event_waitlist_entries
       SET status = 'CANCELLED', updated_at = v_now
     WHERE registration_id = v_reg.id;
  END IF;

  UPDATE public.event_registrations
     SET status = 'CANCELLED',
         cancelled_at = v_now,
         cancellation_reason = p_reason
   WHERE id = p_registration_id;

  RETURN jsonb_build_object(
    'cancelled', true,
    'freed_seat', v_freed_seat,
    'event_id', v_reg.event_id
  );
END;
$$;

-- Promote next waitlist entry to CONFIRMED (called after cancel or by worker)
CREATE OR REPLACE FUNCTION public.rpc_event_promote_waitlist(
  p_event_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config RECORD;
  v_next RECORD;
  v_offer_expires TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_config FROM public.event_registration_config WHERE event_id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('promoted', false, 'reason', 'no_config');
  END IF;

  IF v_config.capacity IS NULL OR v_config.confirmed_count < v_config.capacity THEN
    -- Seat available: find next waiting entry (offer or auto-confirm)
    SELECT w.*, r.id AS reg_id INTO v_next
    FROM public.event_waitlist_entries w
    JOIN public.event_registrations r ON r.id = w.registration_id
    WHERE w.event_id = p_event_id
      AND w.status = 'WAITING'
    ORDER BY w.priority ASC, w.joined_at ASC, w.id ASC
    LIMIT 1
    FOR UPDATE OF w;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('promoted', false, 'reason', 'no_waiting');
    END IF;

    v_offer_expires := v_now + (COALESCE(v_config.waitlist_offer_hours, 12) || ' hours')::INTERVAL;

    UPDATE public.event_waitlist_entries
       SET status = 'OFFERED',
           offered_at = v_now,
           offer_expires_at = v_offer_expires
     WHERE id = v_next.id;

    RETURN jsonb_build_object(
      'promoted', true,
      'offer_id', v_next.id,
      'registration_id', v_next.reg_id,
      'identity_id', v_next.identity_id,
      'offer_expires_at', v_offer_expires
    );
  END IF;

  RETURN jsonb_build_object('promoted', false, 'reason', 'capacity_full');
END;
$$;

-- Accept a waitlist offer (converts to CONFIRMED)
CREATE OR REPLACE FUNCTION public.rpc_event_accept_offer(
  p_waitlist_id UUID,
  p_actor_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry RECORD;
  v_config RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_reg_number TEXT;
BEGIN
  SELECT * INTO v_entry FROM public.event_waitlist_entries WHERE id = p_waitlist_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Waitlist entry not found' USING ERRCODE = '22023';
  END IF;

  IF v_entry.identity_id <> p_actor_id THEN
    RAISE EXCEPTION 'Not your offer' USING ERRCODE = '42501';
  END IF;

  IF v_entry.status <> 'OFFERED' THEN
    RAISE EXCEPTION 'No active offer' USING ERRCODE = '22023';
  END IF;

  IF v_entry.offer_expires_at IS NOT NULL AND v_now > v_entry.offer_expires_at THEN
    UPDATE public.event_waitlist_entries SET status = 'EXPIRED' WHERE id = p_waitlist_id;
    RAISE EXCEPTION 'Offer has expired' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_config FROM public.event_registration_config WHERE event_id = v_entry.event_id FOR UPDATE;

  v_reg_number := 'REG-' || LPAD(nextval('event_registration_number_seq')::TEXT, 6, '0');

  UPDATE public.event_registrations
     SET status = 'CONFIRMED',
         confirmed_at = v_now,
         registration_number = v_reg_number
   WHERE id = v_entry.registration_id;

  UPDATE public.event_waitlist_entries
     SET status = 'ACCEPTED',
         accepted_at = v_now
   WHERE id = p_waitlist_id;

  UPDATE public.event_registration_config
     SET confirmed_count = confirmed_count + 1,
         waitlist_count = GREATEST(0, waitlist_count - 1)
   WHERE event_id = v_entry.event_id;

  RETURN jsonb_build_object(
    'accepted', true,
    'registration_id', v_entry.registration_id,
    'registration_number', v_reg_number
  );
END;
$$;

-- Idempotent QR check-in
CREATE OR REPLACE FUNCTION public.rpc_event_checkin(
  p_token_hash VARCHAR,
  p_actor_id UUID DEFAULT NULL,
  p_device_id VARCHAR DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token RECORD;
  v_reg RECORD;
  v_event RECORD;
  v_attendance RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_token FROM public.event_checkin_tokens WHERE token_hash = p_token_hash;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid check-in token' USING ERRCODE = '22023';
  END IF;

  IF v_token.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Check-in token revoked' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_reg FROM public.event_registrations WHERE id = v_token.registration_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration missing' USING ERRCODE = '22023';
  END IF;

  IF v_reg.status NOT IN ('CONFIRMED', 'ATTENDED') THEN
    RAISE EXCEPTION 'Registration is % — not eligible', v_reg.status USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_event FROM public.event_events WHERE id = v_reg.event_id;
  IF v_event.status = 'CANCELLED' OR v_event.cancelled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Event cancelled' USING ERRCODE = '22023';
  END IF;

  -- Idempotency: existing attendance?
  SELECT * INTO v_attendance FROM public.event_attendance WHERE registration_id = v_reg.id;
  IF FOUND THEN
    UPDATE public.event_attendance
       SET last_scan_at = v_now,
           checkin_count = checkin_count + 1
     WHERE id = v_attendance.id;
    RETURN jsonb_build_object(
      'already_checked_in', true,
      'attendance_id', v_attendance.id,
      'checked_in_at', v_attendance.checked_in_at,
      'registration_number', v_reg.registration_number,
      'identity_id', v_reg.identity_id
    );
  END IF;

  INSERT INTO public.event_attendance
    (event_id, registration_id, identity_id, status, checkin_method, recorded_by, device_id)
  VALUES
    (v_reg.event_id, v_reg.id, v_reg.identity_id, 'CHECKED_IN',
     CASE WHEN p_actor_id IS NULL THEN 'QR' ELSE 'MANUAL' END,
     p_actor_id, p_device_id)
  RETURNING * INTO v_attendance;

  UPDATE public.event_registrations SET status = 'ATTENDED' WHERE id = v_reg.id;

  RETURN jsonb_build_object(
    'already_checked_in', false,
    'attendance_id', v_attendance.id,
    'checked_in_at', v_attendance.checked_in_at,
    'registration_number', v_reg.registration_number,
    'identity_id', v_reg.identity_id
  );
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────────────
-- 9. RLS
-- ────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.event_events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_schedules             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_locations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registration_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_eligibility_rules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_waitlist_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_checkin_tokens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_reminders_schedule    ENABLE ROW LEVEL SECURITY;

-- Events: PUBLISHED visible to community members (or public if visibility=PUBLIC); DRAFT visible to owner
DROP POLICY IF EXISTS "events_read" ON public.event_events;
CREATE POLICY "events_read" ON public.event_events FOR SELECT USING (
  owner_identity_id = auth.uid()
  OR (
    status IN ('PUBLISHED', 'LIVE', 'ENDED', 'ARCHIVED')
    AND (
      visibility = 'PUBLIC'
      OR EXISTS (
        SELECT 1 FROM public.community_memberships cm
        WHERE cm.community_id = event_events.community_id
          AND cm.identity_id = auth.uid()
          AND cm.status = 'ACTIVE'
      )
    )
  )
);

DROP POLICY IF EXISTS "events_insert_admin" ON public.event_events;
CREATE POLICY "events_insert_admin" ON public.event_events FOR INSERT
  WITH CHECK (
    owner_identity_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_memberships cm
      JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
      JOIN public.community_roles cr ON cr.id = mr.role_id
      WHERE cm.community_id = event_events.community_id
        AND cm.identity_id = auth.uid()
        AND cr.role_key IN ('OWNER', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "events_update_owner" ON public.event_events;
CREATE POLICY "events_update_owner" ON public.event_events FOR UPDATE USING (
  owner_identity_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_memberships cm
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE cm.community_id = event_events.community_id
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER', 'ADMIN')
  )
);

-- Follow-on tables inherit event visibility
DROP POLICY IF EXISTS "schedules_read" ON public.event_schedules;
CREATE POLICY "schedules_read" ON public.event_schedules FOR SELECT USING (true);

DROP POLICY IF EXISTS "locations_read" ON public.event_locations;
CREATE POLICY "locations_read" ON public.event_locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "reg_config_read" ON public.event_registration_config;
CREATE POLICY "reg_config_read" ON public.event_registration_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "eligibility_read" ON public.event_eligibility_rules;
CREATE POLICY "eligibility_read" ON public.event_eligibility_rules FOR SELECT USING (true);

-- Registrations: own registration OR event owner/admin
DROP POLICY IF EXISTS "registrations_read" ON public.event_registrations;
CREATE POLICY "registrations_read" ON public.event_registrations FOR SELECT USING (
  identity_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.event_events e
    JOIN public.community_memberships cm ON cm.community_id = e.community_id
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE e.id = event_registrations.event_id
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER', 'ADMIN', 'MODERATOR')
  )
);

DROP POLICY IF EXISTS "waitlist_read" ON public.event_waitlist_entries;
CREATE POLICY "waitlist_read" ON public.event_waitlist_entries FOR SELECT USING (
  identity_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.event_events e
    WHERE e.id = event_waitlist_entries.event_id AND e.owner_identity_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "checkin_tokens_read_own" ON public.event_checkin_tokens;
CREATE POLICY "checkin_tokens_read_own" ON public.event_checkin_tokens FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.event_registrations r
    WHERE r.id = event_checkin_tokens.registration_id AND r.identity_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "attendance_read" ON public.event_attendance;
CREATE POLICY "attendance_read" ON public.event_attendance FOR SELECT USING (
  identity_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.event_events e
    JOIN public.community_memberships cm ON cm.community_id = e.community_id
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE e.id = event_attendance.event_id
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER', 'ADMIN', 'MODERATOR')
  )
);

DROP POLICY IF EXISTS "reminders_read_admin" ON public.event_reminders_schedule;
CREATE POLICY "reminders_read_admin" ON public.event_reminders_schedule FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.event_events e
    WHERE e.id = event_reminders_schedule.event_id AND e.owner_identity_id = auth.uid()
  )
);

-- Realtime for live check-in dashboards
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'event_registrations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_registrations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'event_attendance') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_attendance;
  END IF;
END $$;