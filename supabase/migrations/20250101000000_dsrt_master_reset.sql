-- ================================================================================
-- DSRT PLATFORM — MASTER MIGRATION (Phases 1–15 + Phase G Patches)
--
-- One idempotent script that:
--   1. Creates every table, index, RLS policy, RPC in strict dependency order
--   2. Fixes the 5 errors you just hit
--   3. Applies every Phase A–F code-side patch's SQL companion (Phase G)
--   4. Runs a verification report at the end
--
-- Safe to re-run any number of times.
-- ================================================================================

-- ================================================================================
-- 0. PREREQUISITES
-- ================================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================================
-- 1. KERNEL TABLES (Phase 2) — foundation for everything else
-- ================================================================================

CREATE TABLE IF NOT EXISTS public.kernel_outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(255) NOT NULL,
    event_version INTEGER NOT NULL DEFAULT 1,
    aggregate_type VARCHAR(255) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    correlation_id VARCHAR(255),
    causation_id VARCHAR(255),
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    locked_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_pending
    ON public.kernel_outbox_events(status, created_at)
    WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate
    ON public.kernel_outbox_events(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_outbox_event_type
    ON public.kernel_outbox_events(event_type, created_at DESC);

DROP TRIGGER IF EXISTS set_kernel_outbox_updated_at ON public.kernel_outbox_events;
CREATE TRIGGER set_kernel_outbox_updated_at
BEFORE UPDATE ON public.kernel_outbox_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.kernel_event_consumptions (
    consumer_name VARCHAR(255) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (consumer_name, event_id)
);

CREATE INDEX IF NOT EXISTS idx_consumptions_processed
    ON public.kernel_event_consumptions(processed_at DESC);

CREATE TABLE IF NOT EXISTS public.kernel_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    scope_type VARCHAR(255),
    scope_id VARCHAR(255),
    request_id VARCHAR(255),
    trace_id VARCHAR(255),
    before JSONB,
    after JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity
    ON public.kernel_audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor
    ON public.kernel_audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_scope
    ON public.kernel_audit_logs(scope_type, scope_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action
    ON public.kernel_audit_logs(action, created_at DESC);

CREATE TABLE IF NOT EXISTS public.kernel_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue VARCHAR(255) NOT NULL,
    job_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    attempt INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    priority INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    last_error TEXT,
    idempotency_key VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_pickup
    ON public.kernel_jobs(queue, status, available_at)
    WHERE status = 'QUEUED';
CREATE INDEX IF NOT EXISTS idx_jobs_idempotency
    ON public.kernel_jobs(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

DROP TRIGGER IF EXISTS set_kernel_jobs_updated_at ON public.kernel_jobs;
CREATE TRIGGER set_kernel_jobs_updated_at
BEFORE UPDATE ON public.kernel_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.kernel_idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    identity_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    request_hash VARCHAR(255) NOT NULL,
    response_status INTEGER,
    response_body JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idem_expires
    ON public.kernel_idempotency_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_idem_identity
    ON public.kernel_idempotency_keys(identity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.kernel_rate_limits (
    bucket VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (bucket, subject)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window
    ON public.kernel_rate_limits(window_start);

CREATE TABLE IF NOT EXISTS public.kernel_search_index_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(255) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    operation VARCHAR(50) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_queue_pending
    ON public.kernel_search_index_queue(status, priority DESC, created_at)
    WHERE status = 'PENDING';
CREATE UNIQUE INDEX IF NOT EXISTS uq_search_queue_pending_per_entity
    ON public.kernel_search_index_queue(entity_type, entity_id)
    WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS public.kernel_feature_flags (
    key VARCHAR(255) PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT false,
    rollout_percent INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
    targeting_rules JSONB,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_kernel_flags_updated_at ON public.kernel_feature_flags;
CREATE TRIGGER set_kernel_flags_updated_at
BEFORE UPDATE ON public.kernel_feature_flags
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.kernel_feature_flags (key, enabled, rollout_percent, description)
VALUES ('community_hub_v2', false, 0, 'Community Hub rebuild rollout flag')
ON CONFLICT (key) DO NOTHING;

-- Kernel notifications table upgrade (dual-column bridge — preserves existing notifications)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    CREATE TABLE public.notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      priority VARCHAR(50) NOT NULL DEFAULT 'NORMAL',
      entity_type VARCHAR(255),
      entity_id VARCHAR(255),
      title TEXT NOT NULL,
      body TEXT,
      message TEXT,
      action_url TEXT,
      metadata JSONB,
      from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      icon TEXT,
      read BOOLEAN NOT NULL DEFAULT false,
      read_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  ELSE
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS icon TEXT;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS body TEXT;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(50) NOT NULL DEFAULT 'NORMAL';
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS entity_type VARCHAR(255);
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS entity_id VARCHAR(255);
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

    UPDATE public.notifications SET recipient_id = user_id WHERE recipient_id IS NULL AND user_id IS NOT NULL;
    UPDATE public.notifications SET read_at = COALESCE(created_at, NOW()) WHERE read = true AND read_at IS NULL;
    UPDATE public.notifications SET priority = UPPER(priority) WHERE priority IS NOT NULL AND priority = LOWER(priority);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_notification_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.recipient_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.recipient_id := NEW.user_id;
  ELSIF NEW.user_id IS NULL AND NEW.recipient_id IS NOT NULL THEN
    NEW.user_id := NEW.recipient_id;
  END IF;

  IF NEW.read_at IS NOT NULL AND NEW.read IS DISTINCT FROM true THEN
    NEW.read := true;
  ELSIF NEW.read = true AND NEW.read_at IS NULL THEN
    NEW.read_at := NOW();
  ELSIF NEW.read = false AND NEW.read_at IS NOT NULL THEN
    NEW.read_at := NULL;
  END IF;

  IF NEW.priority IS NOT NULL THEN
    NEW.priority := UPPER(NEW.priority);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_notification_fields ON public.notifications;
CREATE TRIGGER trg_sync_notification_fields
BEFORE INSERT OR UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.sync_notification_fields();

-- Notification indexes (Phase G — these were missing per Issue #2)
CREATE INDEX IF NOT EXISTS idx_notif_recipient_unread
    ON public.notifications(recipient_id, created_at DESC)
    WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notif_recipient_all
    ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_entity
    ON public.notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notif_type
    ON public.notifications(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user_read
    ON public.notifications(user_id, read, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (identity_id, category, channel)
);

DROP TRIGGER IF EXISTS set_notif_prefs_updated_at ON public.notification_preferences;
CREATE TRIGGER set_notif_prefs_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Files
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_identity_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    entity_type VARCHAR(255),
    entity_id VARCHAR(255),
    storage_bucket VARCHAR(255) NOT NULL,
    storage_key TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    checksum VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    visibility VARCHAR(50) NOT NULL DEFAULT 'PRIVATE',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_files_entity
    ON public.files(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_files_owner
    ON public.files(owner_identity_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_files_status
    ON public.files(status);

DROP TRIGGER IF EXISTS set_files_updated_at ON public.files;
CREATE TRIGGER set_files_updated_at
BEFORE UPDATE ON public.files
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.file_upload_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type VARCHAR(255),
    entity_id VARCHAR(255),
    expected_size BIGINT NOT NULL,
    expected_mime VARCHAR(255) NOT NULL,
    storage_bucket VARCHAR(255) NOT NULL,
    storage_key TEXT NOT NULL,
    signed_url_expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    finalized_file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upload_intents_identity
    ON public.file_upload_intents(identity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upload_intents_expires
    ON public.file_upload_intents(signed_url_expires_at) WHERE status = 'PENDING';

-- Kernel RLS
ALTER TABLE public.kernel_outbox_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kernel_event_consumptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kernel_audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kernel_jobs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kernel_idempotency_keys     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kernel_rate_limits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kernel_search_index_queue   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kernel_feature_flags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_upload_intents         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "idem_insert_own" ON public.kernel_idempotency_keys;
CREATE POLICY "idem_insert_own" ON public.kernel_idempotency_keys FOR INSERT
  WITH CHECK (auth.uid() = identity_id);
DROP POLICY IF EXISTS "idem_select_own" ON public.kernel_idempotency_keys;
CREATE POLICY "idem_select_own" ON public.kernel_idempotency_keys FOR SELECT
  USING (auth.uid() = identity_id);

DROP POLICY IF EXISTS "flags_public_read" ON public.kernel_feature_flags;
CREATE POLICY "flags_public_read" ON public.kernel_feature_flags FOR SELECT USING (true);

DROP POLICY IF EXISTS "notif_select_own" ON public.notifications;
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id OR auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_id OR auth.uid() = user_id)
  WITH CHECK (auth.uid() = recipient_id OR auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_delete_own" ON public.notifications;
CREATE POLICY "notif_delete_own" ON public.notifications FOR DELETE
  USING (auth.uid() = recipient_id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_prefs_all_own" ON public.notification_preferences;
CREATE POLICY "notif_prefs_all_own" ON public.notification_preferences FOR ALL
  USING (auth.uid() = identity_id) WITH CHECK (auth.uid() = identity_id);

DROP POLICY IF EXISTS "files_public_read" ON public.files;
CREATE POLICY "files_public_read" ON public.files FOR SELECT
  USING (visibility = 'PUBLIC' AND status = 'AVAILABLE' AND deleted_at IS NULL);
DROP POLICY IF EXISTS "files_owner_read" ON public.files;
CREATE POLICY "files_owner_read" ON public.files FOR SELECT
  USING (auth.uid() = owner_identity_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "upload_intents_select_own" ON public.file_upload_intents;
CREATE POLICY "upload_intents_select_own" ON public.file_upload_intents FOR SELECT
  USING (auth.uid() = identity_id);

-- Realtime for notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END$$;

-- ================================================================================
-- 2. COMMUNITY FOUNDATION (Phase 4) — extends existing communities table
-- ================================================================================

ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS public_id VARCHAR(64);
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS mission TEXT;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'PUBLIC';
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS join_policy VARCHAR(30) DEFAULT 'OPEN';
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS logo_file_id UUID REFERENCES public.files(id) ON DELETE SET NULL;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS cover_file_id UUID REFERENCES public.files(id) ON DELETE SET NULL;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS owner_identity_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS founded_at DATE;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}';
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS location_text VARCHAR(255);
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

UPDATE public.communities
SET
  public_id = COALESCE(public_id, 'COM-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))),
  owner_identity_id = COALESCE(owner_identity_id, created_by),
  short_description = COALESCE(short_description, LEFT(description, 200)),
  visibility = COALESCE(visibility, CASE WHEN is_public = false THEN 'PRIVATE' ELSE 'PUBLIC' END),
  join_policy = COALESCE(join_policy, 'OPEN'),
  status = COALESCE(status, 'ACTIVE'),
  published_at = COALESCE(published_at, created_at),
  updated_at = COALESCE(updated_at, created_at),
  version = COALESCE(version, 1)
WHERE public_id IS NULL OR owner_identity_id IS NULL OR status IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_communities_public_id
    ON public.communities(public_id) WHERE public_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_community_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visibility IS NOT NULL THEN
    NEW.is_public := (NEW.visibility = 'PUBLIC');
  END IF;
  IF NEW.is_public IS NOT NULL AND NEW.visibility IS NULL THEN
    NEW.visibility := CASE WHEN NEW.is_public = false THEN 'PRIVATE' ELSE 'PUBLIC' END;
  END IF;
  IF NEW.public_id IS NULL THEN
    NEW.public_id := 'COM-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8));
  END IF;
  IF NEW.owner_identity_id IS NULL AND NEW.created_by IS NOT NULL THEN
    NEW.owner_identity_id := NEW.created_by;
  ELSIF NEW.created_by IS NULL AND NEW.owner_identity_id IS NOT NULL THEN
    NEW.created_by := NEW.owner_identity_id;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_community_fields ON public.communities;
CREATE TRIGGER trg_sync_community_fields
BEFORE INSERT OR UPDATE ON public.communities
FOR EACH ROW EXECUTE FUNCTION public.sync_community_fields();

-- Community settings / rules / slug history
CREATE TABLE IF NOT EXISTS public.community_settings (
    community_id UUID PRIMARY KEY REFERENCES public.communities(id) ON DELETE CASCADE,
    allow_member_posts BOOLEAN NOT NULL DEFAULT true,
    allow_member_polls BOOLEAN NOT NULL DEFAULT true,
    allow_member_resources BOOLEAN NOT NULL DEFAULT false,
    allow_member_invites BOOLEAN NOT NULL DEFAULT false,
    allow_external_links BOOLEAN NOT NULL DEFAULT true,
    allow_media_uploads BOOLEAN NOT NULL DEFAULT true,
    require_post_approval BOOLEAN NOT NULL DEFAULT false,
    require_application BOOLEAN NOT NULL DEFAULT false,
    show_member_directory BOOLEAN NOT NULL DEFAULT true,
    show_member_count BOOLEAN NOT NULL DEFAULT true,
    default_post_visibility VARCHAR(30) NOT NULL DEFAULT 'MEMBERS',
    notification_defaults JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_community_settings_updated ON public.community_settings;
CREATE TRIGGER trg_community_settings_updated
BEFORE UPDATE ON public.community_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.community_settings (community_id)
SELECT id FROM public.communities
ON CONFLICT (community_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.community_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_rules_community
    ON public.community_rules(community_id, position);

DROP TRIGGER IF EXISTS trg_community_rules_updated ON public.community_rules;
CREATE TRIGGER trg_community_rules_updated
BEFORE UPDATE ON public.community_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.community_slug_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    old_slug VARCHAR(255) NOT NULL,
    new_slug VARCHAR(255) NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slug_history_community ON public.community_slug_history(community_id);
CREATE INDEX IF NOT EXISTS idx_slug_history_old ON public.community_slug_history(old_slug);

-- Roles + permissions
CREATE TABLE IF NOT EXISTS public.community_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    role_key VARCHAR(60) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    position INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(community_id, role_key)
);

CREATE INDEX IF NOT EXISTS idx_community_roles_community ON public.community_roles(community_id);

DROP TRIGGER IF EXISTS trg_community_roles_updated ON public.community_roles;
CREATE TRIGGER trg_community_roles_updated
BEFORE UPDATE ON public.community_roles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.community_role_permissions (
    role_id UUID NOT NULL REFERENCES public.community_roles(id) ON DELETE CASCADE,
    permission_key VARCHAR(100) NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_role_perms_permission
    ON public.community_role_permissions(permission_key);

-- Seed 4 system roles per community
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN SELECT id FROM public.communities LOOP
    INSERT INTO public.community_roles (community_id, role_key, name, description, is_system, position)
    VALUES
      (c.id, 'OWNER',     'Owner',     'Full authority over this community',           true, 1),
      (c.id, 'ADMIN',     'Admin',     'Manage members, content, and settings',        true, 2),
      (c.id, 'MODERATOR', 'Moderator', 'Moderate content and enforce rules',           true, 3),
      (c.id, 'MEMBER',    'Member',    'Standard community member',                    true, 4)
    ON CONFLICT (community_id, role_key) DO NOTHING;
  END LOOP;
END $$;

-- Seed permission bundles per system role (Phase G: includes event/looking_for/recruitment)
INSERT INTO public.community_role_permissions (role_id, permission_key)
SELECT r.id, p.perm
FROM public.community_roles r,
LATERAL (VALUES
  ('community.view'), ('community.update'), ('community.delete'), ('community.archive'), ('community.transfer'),
  ('members.view'), ('members.invite'), ('members.approve'), ('members.remove'), ('members.suspend'), ('members.ban'),
  ('roles.view'), ('roles.assign'), ('roles.create'),
  ('post.create'), ('post.edit'), ('post.delete'), ('post.moderate'),
  ('announcement.create'), ('announcement.publish'), ('announcement.pin'),
  ('poll.create'), ('poll.manage'),
  ('resource.create'), ('resource.edit'), ('resource.delete'),
  ('moderation.review'), ('moderation.warn'), ('moderation.remove'), ('moderation.ban'),
  ('invitation.create'), ('invitation.revoke'),
  ('application.review'), ('application.decide'),
  ('event.view'), ('event.create'), ('event.manage'), ('event.publish'), ('event.cancel'),
  ('event.checkin.manage'), ('event.registration.manage'),
  ('looking_for.view'), ('looking_for.create'), ('looking_for.manage'), ('looking_for.publish'),
  ('recruitment.create'), ('recruitment.manage'), ('recruitment.review'), ('recruitment.decide'),
  ('recruitment.interview.schedule'), ('recruitment.interview.feedback')
) AS p(perm)
WHERE r.role_key = 'OWNER'
ON CONFLICT DO NOTHING;

INSERT INTO public.community_role_permissions (role_id, permission_key)
SELECT r.id, p.perm
FROM public.community_roles r,
LATERAL (VALUES
  ('community.view'), ('community.update'),
  ('members.view'), ('members.invite'), ('members.approve'), ('members.remove'), ('members.suspend'),
  ('roles.view'), ('roles.assign'),
  ('post.create'), ('post.edit'), ('post.moderate'),
  ('announcement.create'), ('announcement.publish'), ('announcement.pin'),
  ('poll.create'), ('poll.manage'),
  ('resource.create'), ('resource.edit'),
  ('moderation.review'), ('moderation.warn'), ('moderation.remove'),
  ('invitation.create'),
  ('application.review'), ('application.decide'),
  ('event.view'), ('event.create'), ('event.manage'), ('event.publish'), ('event.cancel'),
  ('event.checkin.manage'), ('event.registration.manage'),
  ('looking_for.view'), ('looking_for.create'), ('looking_for.manage'), ('looking_for.publish'),
  ('recruitment.create'), ('recruitment.manage'), ('recruitment.review'), ('recruitment.decide'),
  ('recruitment.interview.schedule'), ('recruitment.interview.feedback')
) AS p(perm)
WHERE r.role_key = 'ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO public.community_role_permissions (role_id, permission_key)
SELECT r.id, p.perm
FROM public.community_roles r,
LATERAL (VALUES
  ('community.view'),
  ('members.view'),
  ('post.create'), ('post.moderate'),
  ('moderation.review'), ('moderation.warn'), ('moderation.remove'),
  ('event.view'),
  ('looking_for.view')
) AS p(perm)
WHERE r.role_key = 'MODERATOR'
ON CONFLICT DO NOTHING;

INSERT INTO public.community_role_permissions (role_id, permission_key)
SELECT r.id, p.perm
FROM public.community_roles r,
LATERAL (VALUES
  ('community.view'),
  ('members.view'),
  ('post.create'),
  ('poll.create'),
  ('event.view'),
  ('looking_for.view')
) AS p(perm)
WHERE r.role_key = 'MEMBER'
ON CONFLICT DO NOTHING;

-- Memberships (new state machine, backfilled from legacy)
CREATE TABLE IF NOT EXISTS public.community_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    source VARCHAR(30) NOT NULL DEFAULT 'DIRECT_JOIN',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,
    banned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(community_id, identity_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_community
    ON public.community_memberships(community_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_identity
    ON public.community_memberships(identity_id, status);

DROP TRIGGER IF EXISTS trg_memberships_updated ON public.community_memberships;
CREATE TRIGGER trg_memberships_updated
BEFORE UPDATE ON public.community_memberships
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.community_memberships (community_id, identity_id, status, source, joined_at)
SELECT cm.community_id, cm.user_id, 'ACTIVE', 'MIGRATION',
       COALESCE(cm.joined_at, cm.created_at, NOW())
FROM public.community_members cm
WHERE cm.community_id IS NOT NULL AND cm.user_id IS NOT NULL
ON CONFLICT (community_id, identity_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.community_membership_roles (
    membership_id UUID NOT NULL REFERENCES public.community_memberships(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.community_roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (membership_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_mem_roles_role
    ON public.community_membership_roles(role_id);

-- Backfill role assignments
DO $$
DECLARE m RECORD; target_role_key VARCHAR; role_uuid UUID;
BEGIN
  FOR m IN
    SELECT cm.community_id, cm.user_id, LOWER(COALESCE(cm.role, 'member')) AS old_role
    FROM public.community_members cm
    WHERE cm.community_id IS NOT NULL AND cm.user_id IS NOT NULL
  LOOP
    target_role_key := CASE
      WHEN m.old_role IN ('owner', 'creator') THEN 'OWNER'
      WHEN m.old_role IN ('admin') THEN 'ADMIN'
      WHEN m.old_role IN ('moderator', 'mod') THEN 'MODERATOR'
      ELSE 'MEMBER'
    END;
    SELECT id INTO role_uuid FROM public.community_roles
      WHERE community_id = m.community_id AND role_key = target_role_key;
    IF role_uuid IS NOT NULL THEN
      INSERT INTO public.community_membership_roles (membership_id, role_id)
      SELECT cm2.id, role_uuid
      FROM public.community_memberships cm2
      WHERE cm2.community_id = m.community_id AND cm2.identity_id = m.user_id
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.community_membership_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID REFERENCES public.community_memberships(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mem_events_community
    ON public.community_membership_events(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mem_events_identity
    ON public.community_membership_events(identity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_member_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL REFERENCES public.community_memberships(id) ON DELETE CASCADE,
    restriction_type VARCHAR(50) NOT NULL,
    reason TEXT,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restrictions_membership
    ON public.community_member_restrictions(membership_id);
-- Note: use ends_at column directly, NOT a WHERE ends_at > NOW() partial (would be non-IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_restrictions_ends
    ON public.community_member_restrictions(ends_at);

CREATE TABLE IF NOT EXISTS public.community_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(community_id, identity_id)
);

CREATE INDEX IF NOT EXISTS idx_bans_expires
    ON public.community_bans(community_id, expires_at);

CREATE TABLE IF NOT EXISTS public.community_invitations_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    invited_identity_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_email TEXT,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    role_id UUID REFERENCES public.community_roles(id) ON DELETE SET NULL,
    token_hash VARCHAR(255) NOT NULL,
    token_preview VARCHAR(20),
    message TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_v2_community
    ON public.community_invitations_v2(community_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_v2_identity
    ON public.community_invitations_v2(invited_identity_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_v2_email
    ON public.community_invitations_v2(invited_email, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitations_v2_token
    ON public.community_invitations_v2(token_hash);

CREATE TABLE IF NOT EXISTS public.community_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    review_reason TEXT,
    reviewer_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(community_id, identity_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_community
    ON public.community_applications(community_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_identity
    ON public.community_applications(identity_id, status);

DROP TRIGGER IF EXISTS trg_applications_updated ON public.community_applications;
CREATE TRIGGER trg_applications_updated
BEFORE UPDATE ON public.community_applications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.community_application_answers (
    application_id UUID NOT NULL REFERENCES public.community_applications(id) ON DELETE CASCADE,
    question_key VARCHAR(100) NOT NULL,
    question_label TEXT,
    answer_value TEXT,
    answer_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (application_id, question_key)
);

-- CRITICAL: this is the table that was missing when Phase 6 ran
CREATE TABLE IF NOT EXISTS public.community_follows_v2 (
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    followed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (identity_id, community_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_v2_community
    ON public.community_follows_v2(community_id, followed_at DESC);

CREATE TABLE IF NOT EXISTS public.community_visits_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_visits_v2_community
    ON public.community_visits_v2(community_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_v2_identity
    ON public.community_visits_v2(identity_id, visited_at DESC);

CREATE TABLE IF NOT EXISTS public.community_projects_ref (
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    relationship_type VARCHAR(50) NOT NULL DEFAULT 'FEATURED',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (community_id, project_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_comm_projects_project
    ON public.community_projects_ref(project_id);

CREATE TABLE IF NOT EXISTS public.community_ventures_ref (
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    venture_id UUID NOT NULL,
    relationship_type VARCHAR(50) NOT NULL DEFAULT 'FEATURED',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (community_id, venture_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_comm_ventures_venture
    ON public.community_ventures_ref(venture_id);

-- Backfill community_follows_v2 from legacy follows (the query that was failing)
INSERT INTO public.community_follows_v2 (identity_id, community_id, followed_at)
SELECT f.follower_id, f.following_id, COALESCE(f.created_at, NOW())
FROM public.follows f
WHERE f.following_type = 'community'
  AND f.follower_id IS NOT NULL
  AND f.following_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.communities c WHERE c.id = f.following_id)
ON CONFLICT (identity_id, community_id) DO NOTHING;

-- Community RLS
ALTER TABLE public.community_settings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_rules                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_slug_history            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_roles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_role_permissions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_memberships             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_membership_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_membership_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_member_restrictions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_bans                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_invitations_v2          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_applications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_application_answers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_follows_v2              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_visits_v2               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_projects_ref            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_ventures_ref            ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_read_all" ON public.community_settings;
CREATE POLICY "settings_read_all" ON public.community_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "rules_read_all" ON public.community_rules;
CREATE POLICY "rules_read_all" ON public.community_rules FOR SELECT USING (true);
DROP POLICY IF EXISTS "roles_read_all" ON public.community_roles;
CREATE POLICY "roles_read_all" ON public.community_roles FOR SELECT USING (true);
DROP POLICY IF EXISTS "role_perms_read_all" ON public.community_role_permissions;
CREATE POLICY "role_perms_read_all" ON public.community_role_permissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "memberships_read_all" ON public.community_memberships;
CREATE POLICY "memberships_read_all" ON public.community_memberships FOR SELECT USING (true);
DROP POLICY IF EXISTS "memberships_insert_self" ON public.community_memberships;
CREATE POLICY "memberships_insert_self" ON public.community_memberships FOR INSERT
  WITH CHECK (auth.uid() = identity_id);
DROP POLICY IF EXISTS "memberships_update_own_or_admin" ON public.community_memberships;
CREATE POLICY "memberships_update_own_or_admin" ON public.community_memberships FOR UPDATE
  USING (
    auth.uid() = identity_id
    OR EXISTS (
      SELECT 1 FROM public.community_memberships cm
      JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
      JOIN public.community_roles cr ON cr.id = mr.role_id
      WHERE cm.community_id = community_memberships.community_id
        AND cm.identity_id = auth.uid()
        AND cr.role_key IN ('OWNER', 'ADMIN')
    )
  );
DROP POLICY IF EXISTS "memberships_delete_self" ON public.community_memberships;
CREATE POLICY "memberships_delete_self" ON public.community_memberships FOR DELETE
  USING (auth.uid() = identity_id);
DROP POLICY IF EXISTS "mem_roles_read_all" ON public.community_membership_roles;
CREATE POLICY "mem_roles_read_all" ON public.community_membership_roles FOR SELECT USING (true);
DROP POLICY IF EXISTS "follows_v2_read_all" ON public.community_follows_v2;
CREATE POLICY "follows_v2_read_all" ON public.community_follows_v2 FOR SELECT USING (true);
DROP POLICY IF EXISTS "follows_v2_insert_self" ON public.community_follows_v2;
CREATE POLICY "follows_v2_insert_self" ON public.community_follows_v2 FOR INSERT
  WITH CHECK (auth.uid() = identity_id);
DROP POLICY IF EXISTS "follows_v2_delete_self" ON public.community_follows_v2;
CREATE POLICY "follows_v2_delete_self" ON public.community_follows_v2 FOR DELETE
  USING (auth.uid() = identity_id);
DROP POLICY IF EXISTS "visits_v2_insert" ON public.community_visits_v2;
CREATE POLICY "visits_v2_insert" ON public.community_visits_v2 FOR INSERT
  WITH CHECK (auth.uid() = identity_id OR identity_id IS NULL);
DROP POLICY IF EXISTS "projects_ref_read" ON public.community_projects_ref;
CREATE POLICY "projects_ref_read" ON public.community_projects_ref FOR SELECT USING (true);
DROP POLICY IF EXISTS "ventures_ref_read" ON public.community_ventures_ref;
CREATE POLICY "ventures_ref_read" ON public.community_ventures_ref FOR SELECT USING (true);
DROP POLICY IF EXISTS "applications_insert_self" ON public.community_applications;
CREATE POLICY "applications_insert_self" ON public.community_applications FOR INSERT
  WITH CHECK (auth.uid() = identity_id);
DROP POLICY IF EXISTS "applications_read_related" ON public.community_applications;
CREATE POLICY "applications_read_related" ON public.community_applications FOR SELECT
  USING (
    auth.uid() = identity_id
    OR EXISTS (
      SELECT 1 FROM public.community_memberships cm
      JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
      JOIN public.community_roles cr ON cr.id = mr.role_id
      WHERE cm.community_id = community_applications.community_id
        AND cm.identity_id = auth.uid()
        AND cr.role_key IN ('OWNER', 'ADMIN')
    )
  );

-- ================================================================================
-- 3. PHASE 5 — DISCOVER SUPPORT (events + rising view)
-- FIX: partial index using NOW() → replaced with plain index (still fast enough)
-- ================================================================================

CREATE TABLE IF NOT EXISTS public.community_discover_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL,
    surface VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discover_events_community
    ON public.community_discover_events(community_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discover_events_identity
    ON public.community_discover_events(identity_id, event_type, created_at DESC);
-- FIX: no NOW() in partial predicate — was causing the IMMUTABLE error
CREATE INDEX IF NOT EXISTS idx_discover_events_type_time
    ON public.community_discover_events(event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_discover_dismissals (
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (identity_id, community_id)
);

ALTER TABLE public.community_discover_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_discover_dismissals  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discover_events_insert" ON public.community_discover_events;
CREATE POLICY "discover_events_insert" ON public.community_discover_events FOR INSERT
  WITH CHECK (identity_id = auth.uid() OR identity_id IS NULL);
DROP POLICY IF EXISTS "discover_events_read_own" ON public.community_discover_events;
CREATE POLICY "discover_events_read_own" ON public.community_discover_events FOR SELECT
  USING (identity_id = auth.uid());
DROP POLICY IF EXISTS "discover_dismissals_own" ON public.community_discover_dismissals;
CREATE POLICY "discover_dismissals_own" ON public.community_discover_dismissals FOR ALL
  USING (identity_id = auth.uid()) WITH CHECK (identity_id = auth.uid());

-- Rising view (queried live, no partial index issues)
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

-- ================================================================================
-- 4. PHASE 6 — MY NETWORK PROJECTION
-- ================================================================================

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
CREATE INDEX IF NOT EXISTS idx_activity_proj_verb
    ON public.community_activity_projection(verb, occurred_at DESC);

ALTER TABLE public.community_activity_projection ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_proj_read" ON public.community_activity_projection;
CREATE POLICY "activity_proj_read" ON public.community_activity_projection FOR SELECT
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

INSERT INTO public.community_activity_projection
  (community_id, actor_id, verb, object_type, object_id, subject_identity_id, visibility, occurred_at, event_id)
SELECT cm.community_id, cm.identity_id, 'community.member.joined', 'community_membership',
       cm.id, cm.identity_id, 'MEMBERS', cm.joined_at, 'backfill_join_' || cm.id::text
FROM public.community_memberships cm
WHERE cm.status = 'ACTIVE'
  AND cm.joined_at > NOW() - INTERVAL '90 days'
ON CONFLICT (event_id) DO NOTHING;

CREATE OR REPLACE VIEW public.community_network_edges AS
SELECT
    a.identity_id AS viewer_id,
    b.identity_id AS peer_id,
    COUNT(DISTINCT a.community_id) AS shared_communities,
    ARRAY_AGG(DISTINCT a.community_id) AS shared_community_ids,
    MAX(GREATEST(a.joined_at, b.joined_at)) AS most_recent_shared_at
FROM public.community_memberships a
JOIN public.community_memberships b
     ON a.community_id = b.community_id AND a.identity_id <> b.identity_id
WHERE a.status = 'ACTIVE' AND b.status = 'ACTIVE'
GROUP BY a.identity_id, b.identity_id;

-- ================================================================================
-- 5. PHASE 7 — DRAFTS
-- ================================================================================

CREATE TABLE IF NOT EXISTS public.community_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
    step VARCHAR(40) NOT NULL DEFAULT 'identity',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    autosave_version INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    discarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drafts_owner
    ON public.community_drafts(owner_identity_id, updated_at DESC);

DROP TRIGGER IF EXISTS trg_community_drafts_updated ON public.community_drafts;
CREATE TRIGGER trg_community_drafts_updated
BEFORE UPDATE ON public.community_drafts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.community_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drafts_owner_all" ON public.community_drafts;
CREATE POLICY "drafts_owner_all" ON public.community_drafts FOR ALL
  USING (auth.uid() = owner_identity_id) WITH CHECK (auth.uid() = owner_identity_id);

-- Storage bucket for community assets
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'community-assets') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('community-assets', 'community-assets', true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='community_assets_owner_upload') THEN
    CREATE POLICY "community_assets_owner_upload" ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'community-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='community_assets_public_read') THEN
    CREATE POLICY "community_assets_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'community-assets');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='community_assets_owner_delete') THEN
    CREATE POLICY "community_assets_owner_delete" ON storage.objects FOR DELETE
      USING (bucket_id = 'community-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- ================================================================================
-- 6. PHASE 10 — CONTENT SYSTEM
-- ================================================================================

CREATE TABLE IF NOT EXISTS public.community_posts_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    author_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_type VARCHAR(30) NOT NULL DEFAULT 'TEXT',
    title VARCHAR(300),
    body TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED',
    visibility VARCHAR(30) NOT NULL DEFAULT 'MEMBERS',
    link_url TEXT,
    link_preview JSONB,
    poll_id UUID,
    reaction_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    pinned_at TIMESTAMPTZ,
    pinned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_v2_community_created
    ON public.community_posts_v2(community_id, created_at DESC)
    WHERE deleted_at IS NULL AND status = 'PUBLISHED';
CREATE INDEX IF NOT EXISTS idx_posts_v2_author
    ON public.community_posts_v2(author_identity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_v2_pinned
    ON public.community_posts_v2(community_id, pinned_at DESC)
    WHERE pinned_at IS NOT NULL AND deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_posts_v2_updated ON public.community_posts_v2;
CREATE TRIGGER trg_posts_v2_updated
BEFORE UPDATE ON public.community_posts_v2
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.community_post_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.community_posts_v2(id) ON DELETE CASCADE,
    file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
    attachment_type VARCHAR(30) NOT NULL DEFAULT 'IMAGE',
    url TEXT,
    caption TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_attachments_post
    ON public.community_post_attachments(post_id, position);

CREATE TABLE IF NOT EXISTS public.community_post_mentions (
    post_id UUID NOT NULL REFERENCES public.community_posts_v2(id) ON DELETE CASCADE,
    mentioned_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, mentioned_identity_id)
);

CREATE INDEX IF NOT EXISTS idx_post_mentions_identity
    ON public.community_post_mentions(mentioned_identity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_post_tags (
    post_id UUID NOT NULL REFERENCES public.community_posts_v2(id) ON DELETE CASCADE,
    tag VARCHAR(60) NOT NULL,
    PRIMARY KEY (post_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON public.community_post_tags(tag);

CREATE TABLE IF NOT EXISTS public.community_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    author_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    body TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED',
    pinned BOOLEAN NOT NULL DEFAULT false,
    pin_expires_at TIMESTAMPTZ,
    allow_comments BOOLEAN NOT NULL DEFAULT true,
    fanout_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    fanout_completed_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ,
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_community
    ON public.community_announcements(community_id, published_at DESC)
    WHERE deleted_at IS NULL AND status = 'PUBLISHED';
CREATE INDEX IF NOT EXISTS idx_announcements_pinned
    ON public.community_announcements(community_id, pinned)
    WHERE pinned = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_fanout
    ON public.community_announcements(fanout_status, published_at)
    WHERE fanout_status = 'PENDING';

DROP TRIGGER IF EXISTS trg_announcements_updated ON public.community_announcements;
CREATE TRIGGER trg_announcements_updated
BEFORE UPDATE ON public.community_announcements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.community_announcement_reads (
    announcement_id UUID NOT NULL REFERENCES public.community_announcements(id) ON DELETE CASCADE,
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (announcement_id, identity_id)
);

CREATE TABLE IF NOT EXISTS public.community_polls_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.community_posts_v2(id) ON DELETE CASCADE,
    author_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    multiple_choice BOOLEAN NOT NULL DEFAULT false,
    anonymous BOOLEAN NOT NULL DEFAULT false,
    allow_change_vote BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    total_votes INTEGER NOT NULL DEFAULT 0,
    unique_voters INTEGER NOT NULL DEFAULT 0,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_polls_v2_community
    ON public.community_polls_v2(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_v2_post
    ON public.community_polls_v2(post_id);

DROP TRIGGER IF EXISTS trg_polls_v2_updated ON public.community_polls_v2;
CREATE TRIGGER trg_polls_v2_updated
BEFORE UPDATE ON public.community_polls_v2
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'community_posts_v2_poll_id_fkey' AND table_name = 'community_posts_v2'
  ) THEN
    ALTER TABLE public.community_posts_v2 ADD CONSTRAINT community_posts_v2_poll_id_fkey
      FOREIGN KEY (poll_id) REFERENCES public.community_polls_v2(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.community_poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.community_polls_v2(id) ON DELETE CASCADE,
    label VARCHAR(200) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    vote_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll
    ON public.community_poll_options(poll_id, position);

CREATE TABLE IF NOT EXISTS public.community_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.community_polls_v2(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.community_poll_options(id) ON DELETE CASCADE,
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_poll_vote_identity_option
    ON public.community_poll_votes(poll_id, identity_id, option_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option
    ON public.community_poll_votes(option_id);

CREATE TABLE IF NOT EXISTS public.community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    target_type VARCHAR(30) NOT NULL,
    target_id UUID NOT NULL,
    parent_comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
    author_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    reaction_count INTEGER NOT NULL DEFAULT 0,
    reply_count INTEGER NOT NULL DEFAULT 0,
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_target
    ON public.community_comments(target_type, target_id, created_at ASC)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_author
    ON public.community_comments(author_identity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent
    ON public.community_comments(parent_comment_id, created_at ASC)
    WHERE parent_comment_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_comments_updated ON public.community_comments;
CREATE TRIGGER trg_comments_updated
BEFORE UPDATE ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.community_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(30) NOT NULL,
    target_id UUID NOT NULL,
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reactions_unique
    ON public.community_reactions(target_type, target_id, identity_id);
CREATE INDEX IF NOT EXISTS idx_reactions_target
    ON public.community_reactions(target_type, target_id, created_at DESC);

-- Content RLS (short versions — see full policies in earlier phase files)
ALTER TABLE public.community_posts_v2               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_attachments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_mentions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_tags              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_announcements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_announcement_reads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_polls_v2               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_poll_options           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_poll_votes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reactions              ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_v2_read" ON public.community_posts_v2;
CREATE POLICY "posts_v2_read" ON public.community_posts_v2 FOR SELECT USING (
  deleted_at IS NULL AND status = 'PUBLISHED' AND (
    visibility = 'PUBLIC'
    OR EXISTS (SELECT 1 FROM public.community_memberships cm
      WHERE cm.community_id = community_posts_v2.community_id
        AND cm.identity_id = auth.uid() AND cm.status = 'ACTIVE')
    OR author_identity_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "posts_v2_insert_member" ON public.community_posts_v2;
CREATE POLICY "posts_v2_insert_member" ON public.community_posts_v2 FOR INSERT
  WITH CHECK (
    author_identity_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.community_memberships cm
      WHERE cm.community_id = community_posts_v2.community_id
        AND cm.identity_id = auth.uid() AND cm.status = 'ACTIVE')
  );
DROP POLICY IF EXISTS "posts_v2_update_own" ON public.community_posts_v2;
CREATE POLICY "posts_v2_update_own" ON public.community_posts_v2 FOR UPDATE
  USING (author_identity_id = auth.uid());
DROP POLICY IF EXISTS "post_attachments_read" ON public.community_post_attachments;
CREATE POLICY "post_attachments_read" ON public.community_post_attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.community_posts_v2 p
    WHERE p.id = community_post_attachments.post_id AND p.deleted_at IS NULL)
);
DROP POLICY IF EXISTS "post_mentions_read" ON public.community_post_mentions;
CREATE POLICY "post_mentions_read" ON public.community_post_mentions FOR SELECT USING (true);
DROP POLICY IF EXISTS "post_tags_read" ON public.community_post_tags;
CREATE POLICY "post_tags_read" ON public.community_post_tags FOR SELECT USING (true);
DROP POLICY IF EXISTS "announcements_read" ON public.community_announcements;
CREATE POLICY "announcements_read" ON public.community_announcements FOR SELECT USING (
  deleted_at IS NULL AND status = 'PUBLISHED' AND (
    EXISTS (SELECT 1 FROM public.community_memberships cm
      WHERE cm.community_id = community_announcements.community_id
        AND cm.identity_id = auth.uid() AND cm.status = 'ACTIVE')
    OR EXISTS (SELECT 1 FROM public.communities c
      WHERE c.id = community_announcements.community_id AND c.visibility = 'PUBLIC')
  )
);
DROP POLICY IF EXISTS "polls_v2_read" ON public.community_polls_v2;
CREATE POLICY "polls_v2_read" ON public.community_polls_v2 FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.community_memberships cm
    WHERE cm.community_id = community_polls_v2.community_id
      AND cm.identity_id = auth.uid() AND cm.status = 'ACTIVE')
  OR EXISTS (SELECT 1 FROM public.communities c
    WHERE c.id = community_polls_v2.community_id AND c.visibility = 'PUBLIC')
);
DROP POLICY IF EXISTS "poll_options_read" ON public.community_poll_options;
CREATE POLICY "poll_options_read" ON public.community_poll_options FOR SELECT USING (true);
DROP POLICY IF EXISTS "poll_votes_read_own" ON public.community_poll_votes;
CREATE POLICY "poll_votes_read_own" ON public.community_poll_votes FOR SELECT USING (
  identity_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.community_polls_v2 p
    WHERE p.id = community_poll_votes.poll_id AND p.anonymous = false)
);
DROP POLICY IF EXISTS "comments_read" ON public.community_comments;
CREATE POLICY "comments_read" ON public.community_comments FOR SELECT USING (
  deleted_at IS NULL AND (
    EXISTS (SELECT 1 FROM public.community_memberships cm
      WHERE cm.community_id = community_comments.community_id
        AND cm.identity_id = auth.uid() AND cm.status = 'ACTIVE')
    OR EXISTS (SELECT 1 FROM public.communities c
      WHERE c.id = community_comments.community_id AND c.visibility = 'PUBLIC')
  )
);
DROP POLICY IF EXISTS "comments_insert_member" ON public.community_comments;
CREATE POLICY "comments_insert_member" ON public.community_comments FOR INSERT
  WITH CHECK (author_identity_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.community_memberships cm
      WHERE cm.community_id = community_comments.community_id
        AND cm.identity_id = auth.uid() AND cm.status = 'ACTIVE'));
DROP POLICY IF EXISTS "comments_update_own" ON public.community_comments;
CREATE POLICY "comments_update_own" ON public.community_comments FOR UPDATE
  USING (author_identity_id = auth.uid());
DROP POLICY IF EXISTS "reactions_read" ON public.community_reactions;
CREATE POLICY "reactions_read" ON public.community_reactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "reactions_insert_own" ON public.community_reactions;
CREATE POLICY "reactions_insert_own" ON public.community_reactions FOR INSERT
  WITH CHECK (identity_id = auth.uid());
DROP POLICY IF EXISTS "reactions_delete_own" ON public.community_reactions;
CREATE POLICY "reactions_delete_own" ON public.community_reactions FOR DELETE
  USING (identity_id = auth.uid());
DROP POLICY IF EXISTS "reactions_update_own" ON public.community_reactions;
CREATE POLICY "reactions_update_own" ON public.community_reactions FOR UPDATE
  USING (identity_id = auth.uid());

-- ================================================================================
-- 7. PHASE 11 — MODERATION
-- ================================================================================

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
CREATE UNIQUE INDEX IF NOT EXISTS uq_cases_active_per_target
    ON public.community_moderation_cases(community_id, target_type, target_id)
    WHERE status IN ('OPEN', 'UNDER_REVIEW');

DROP TRIGGER IF EXISTS trg_cases_updated ON public.community_moderation_cases;
CREATE TRIGGER trg_cases_updated
BEFORE UPDATE ON public.community_moderation_cases
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
    case_id UUID REFERENCES public.community_moderation_cases(id) ON DELETE SET NULL,
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
CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_active
    ON public.community_reports(reporter_identity_id, target_type, target_id)
    WHERE status IN ('OPEN', 'UNDER_REVIEW');

DROP TRIGGER IF EXISTS trg_reports_updated ON public.community_reports;
CREATE TRIGGER trg_reports_updated
BEFORE UPDATE ON public.community_reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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

CREATE INDEX IF NOT EXISTS idx_mod_actions_case
    ON public.community_moderation_actions(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mod_actions_community
    ON public.community_moderation_actions(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mod_actions_target_author
    ON public.community_moderation_actions(target_author_identity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mod_actions_target
    ON public.community_moderation_actions(target_type, target_id, created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_evidence_case
    ON public.community_moderation_evidence(case_id, created_at ASC);

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
CREATE UNIQUE INDEX IF NOT EXISTS uq_appeals_active
    ON public.community_appeals(appellant_id, action_id)
    WHERE status IN ('SUBMITTED', 'UNDER_REVIEW');

DROP TRIGGER IF EXISTS trg_appeals_updated ON public.community_appeals;
CREATE TRIGGER trg_appeals_updated
BEFORE UPDATE ON public.community_appeals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.community_reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_moderation_cases     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_moderation_actions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_moderation_evidence  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_appeals              ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_own" ON public.community_reports;
CREATE POLICY "reports_insert_own" ON public.community_reports FOR INSERT
  WITH CHECK (reporter_identity_id = auth.uid());
DROP POLICY IF EXISTS "reports_read_own_or_mod" ON public.community_reports;
CREATE POLICY "reports_read_own_or_mod" ON public.community_reports FOR SELECT USING (
  reporter_identity_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.community_memberships cm
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE cm.community_id = community_reports.community_id
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER', 'ADMIN', 'MODERATOR'))
);
DROP POLICY IF EXISTS "appeals_insert_own" ON public.community_appeals;
CREATE POLICY "appeals_insert_own" ON public.community_appeals FOR INSERT
  WITH CHECK (appellant_id = auth.uid());
DROP POLICY IF EXISTS "appeals_read_related" ON public.community_appeals;
CREATE POLICY "appeals_read_related" ON public.community_appeals FOR SELECT USING (
  appellant_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.community_memberships cm
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE cm.community_id = community_appeals.community_id
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER', 'ADMIN', 'MODERATOR'))
);

-- ================================================================================
-- 8. PHASE 12 — OPERATIONS ENGINE (Forms + Workflows + Buckets)
-- ================================================================================

CREATE TABLE IF NOT EXISTS public.operations_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
    owner_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key VARCHAR(80) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    purpose VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    current_version INTEGER NOT NULL DEFAULT 1,
    published_version INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forms_community
    ON public.operations_forms(community_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_forms_key_per_community
    ON public.operations_forms(community_id, key) WHERE community_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_forms_updated ON public.operations_forms;
CREATE TRIGGER trg_forms_updated BEFORE UPDATE ON public.operations_forms
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.operations_form_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.operations_forms(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMPTZ,
    published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    schema_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(form_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.operations_form_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_version_id UUID NOT NULL REFERENCES public.operations_form_versions(id) ON DELETE CASCADE,
    key VARCHAR(80) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(form_version_id, key)
);

CREATE TABLE IF NOT EXISTS public.operations_form_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_version_id UUID NOT NULL REFERENCES public.operations_form_versions(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.operations_form_sections(id) ON DELETE CASCADE,
    key VARCHAR(80) NOT NULL,
    label VARCHAR(400) NOT NULL,
    description TEXT,
    type VARCHAR(30) NOT NULL,
    required BOOLEAN NOT NULL DEFAULT false,
    position INTEGER NOT NULL DEFAULT 0,
    placeholder TEXT,
    default_value JSONB,
    validation_rules JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(form_version_id, key)
);

CREATE TABLE IF NOT EXISTS public.operations_form_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.operations_form_questions(id) ON DELETE CASCADE,
    value VARCHAR(200) NOT NULL,
    label VARCHAR(300) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.operations_form_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_version_id UUID NOT NULL REFERENCES public.operations_form_versions(id) ON DELETE CASCADE,
    rule_type VARCHAR(30) NOT NULL,
    condition JSONB NOT NULL,
    action JSONB NOT NULL,
    target_question_id UUID REFERENCES public.operations_form_questions(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.operations_form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.operations_forms(id) ON DELETE CASCADE,
    form_version_id UUID NOT NULL REFERENCES public.operations_form_versions(id) ON DELETE CASCADE,
    identity_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    parent_entity_type VARCHAR(50),
    parent_entity_id UUID,
    metadata JSONB,
    submitted_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_form
    ON public.operations_form_submissions(form_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_identity
    ON public.operations_form_submissions(identity_id, status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_parent
    ON public.operations_form_submissions(parent_entity_type, parent_entity_id);

DROP TRIGGER IF EXISTS trg_form_submissions_updated ON public.operations_form_submissions;
CREATE TRIGGER trg_form_submissions_updated
BEFORE UPDATE ON public.operations_form_submissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.operations_form_answers (
    submission_id UUID NOT NULL REFERENCES public.operations_form_submissions(id) ON DELETE CASCADE,
    question_key VARCHAR(80) NOT NULL,
    question_label TEXT,
    question_type VARCHAR(30),
    value_text TEXT,
    value_number NUMERIC,
    value_boolean BOOLEAN,
    value_json JSONB,
    file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (submission_id, question_key)
);

-- Workflows
CREATE TABLE IF NOT EXISTS public.operations_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
    owner_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key VARCHAR(80) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    purpose VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    current_version INTEGER NOT NULL DEFAULT 1,
    published_version INTEGER,
    is_template BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_community
    ON public.operations_workflows(community_id, status);

DROP TRIGGER IF EXISTS trg_workflows_updated ON public.operations_workflows;
CREATE TRIGGER trg_workflows_updated BEFORE UPDATE ON public.operations_workflows
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.operations_workflow_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.operations_workflows(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMPTZ,
    published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    schema_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workflow_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.operations_workflow_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_version_id UUID NOT NULL REFERENCES public.operations_workflow_versions(id) ON DELETE CASCADE,
    key VARCHAR(60) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_initial BOOLEAN NOT NULL DEFAULT false,
    is_terminal BOOLEAN NOT NULL DEFAULT false,
    color_token VARCHAR(30),
    position INTEGER NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workflow_version_id, key)
);

CREATE TABLE IF NOT EXISTS public.operations_workflow_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_version_id UUID NOT NULL REFERENCES public.operations_workflow_versions(id) ON DELETE CASCADE,
    from_state_id UUID NOT NULL REFERENCES public.operations_workflow_states(id) ON DELETE CASCADE,
    to_state_id UUID NOT NULL REFERENCES public.operations_workflow_states(id) ON DELETE CASCADE,
    key VARCHAR(60) NOT NULL,
    label VARCHAR(150) NOT NULL,
    required_permission VARCHAR(100),
    guard_conditions JSONB,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workflow_version_id, from_state_id, key)
);

CREATE TABLE IF NOT EXISTS public.operations_workflow_action_registry (
    action_type VARCHAR(60) PRIMARY KEY,
    label VARCHAR(150) NOT NULL,
    description TEXT,
    param_schema JSONB
);

INSERT INTO public.operations_workflow_action_registry (action_type, label, description) VALUES
  ('SEND_NOTIFICATION', 'Send in-app notification', 'Notify a specific user or role'),
  ('SEND_MAIL', 'Send email', 'Send DSRT Mail message'),
  ('MOVE_BUCKET', 'Move to bucket', 'Move the linked item to a target bucket'),
  ('ASSIGN_REVIEWER', 'Assign reviewer', 'Assign a reviewer to the run'),
  ('CREATE_TASK', 'Create task', 'Create an operational task'),
  ('ADD_TAG', 'Add tag', 'Tag the run for filtering'),
  ('REMOVE_TAG', 'Remove tag', 'Remove a tag from the run'),
  ('CREATE_AUDIT', 'Log audit', 'Record an explicit audit entry'),
  ('SCHEDULE_JOB', 'Schedule job', 'Schedule an async job (reminder, expiry)')
ON CONFLICT (action_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.operations_workflow_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transition_id UUID NOT NULL REFERENCES public.operations_workflow_transitions(id) ON DELETE CASCADE,
    action_type VARCHAR(60) NOT NULL REFERENCES public.operations_workflow_action_registry(action_type),
    params JSONB,
    position INTEGER NOT NULL DEFAULT 0,
    run_async BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.operations_workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.operations_workflows(id) ON DELETE CASCADE,
    workflow_version_id UUID NOT NULL REFERENCES public.operations_workflow_versions(id) ON DELETE CASCADE,
    current_state_id UUID REFERENCES public.operations_workflow_states(id) ON DELETE SET NULL,
    target_entity_type VARCHAR(50) NOT NULL,
    target_entity_id UUID NOT NULL,
    subject_identity_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow
    ON public.operations_workflow_runs(workflow_id, current_state_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_target
    ON public.operations_workflow_runs(target_entity_type, target_entity_id);

DROP TRIGGER IF EXISTS trg_workflow_runs_updated ON public.operations_workflow_runs;
CREATE TRIGGER trg_workflow_runs_updated
BEFORE UPDATE ON public.operations_workflow_runs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.operations_workflow_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.operations_workflow_runs(id) ON DELETE CASCADE,
    from_state_id UUID REFERENCES public.operations_workflow_states(id) ON DELETE SET NULL,
    to_state_id UUID REFERENCES public.operations_workflow_states(id) ON DELETE SET NULL,
    transition_id UUID REFERENCES public.operations_workflow_transitions(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT,
    metadata JSONB,
    correlation_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_history_run
    ON public.operations_workflow_history(run_id, created_at ASC);

-- Buckets
CREATE TABLE IF NOT EXISTS public.operations_bucket_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
    owner_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key VARCHAR(80) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    parent_entity_type VARCHAR(50),
    parent_entity_id UUID,
    linked_workflow_id UUID REFERENCES public.operations_workflows(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_bucket_boards_updated ON public.operations_bucket_boards;
CREATE TRIGGER trg_bucket_boards_updated
BEFORE UPDATE ON public.operations_bucket_boards
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.operations_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.operations_bucket_boards(id) ON DELETE CASCADE,
    key VARCHAR(80) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    color_token VARCHAR(30) NOT NULL DEFAULT 'neutral',
    linked_state_id UUID REFERENCES public.operations_workflow_states(id) ON DELETE SET NULL,
    position INTEGER NOT NULL DEFAULT 0,
    entry_conditions JSONB,
    exit_conditions JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(board_id, key)
);

CREATE TABLE IF NOT EXISTS public.operations_bucket_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.operations_bucket_boards(id) ON DELETE CASCADE,
    bucket_id UUID NOT NULL REFERENCES public.operations_buckets(id) ON DELETE CASCADE,
    target_entity_type VARCHAR(50) NOT NULL,
    target_entity_id UUID NOT NULL,
    workflow_run_id UUID REFERENCES public.operations_workflow_runs(id) ON DELETE SET NULL,
    position INTEGER NOT NULL DEFAULT 0,
    metadata JSONB,
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(board_id, target_entity_type, target_entity_id)
);

DROP TRIGGER IF EXISTS trg_bucket_items_updated ON public.operations_bucket_items;
CREATE TRIGGER trg_bucket_items_updated
BEFORE UPDATE ON public.operations_bucket_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.operations_bucket_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.operations_bucket_items(id) ON DELETE CASCADE,
    from_bucket_id UUID REFERENCES public.operations_buckets(id) ON DELETE SET NULL,
    to_bucket_id UUID NOT NULL REFERENCES public.operations_buckets(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT,
    correlation_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bucket_history_item
    ON public.operations_bucket_history(item_id, created_at ASC);

-- Operations RLS (open reads on form structure, owner-only writes)
ALTER TABLE public.operations_forms                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_form_versions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_form_sections             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_form_questions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_form_options              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_form_rules                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_form_submissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_form_answers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_workflows                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_workflow_versions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_workflow_states           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_workflow_transitions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_workflow_action_registry  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_workflow_actions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_workflow_runs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_workflow_history          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_bucket_boards             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_buckets                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_bucket_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_bucket_history            ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "action_registry_read" ON public.operations_workflow_action_registry;
CREATE POLICY "action_registry_read" ON public.operations_workflow_action_registry FOR SELECT USING (true);
DROP POLICY IF EXISTS "form_versions_read" ON public.operations_form_versions;
CREATE POLICY "form_versions_read" ON public.operations_form_versions FOR SELECT USING (true);
DROP POLICY IF EXISTS "form_sections_read" ON public.operations_form_sections;
CREATE POLICY "form_sections_read" ON public.operations_form_sections FOR SELECT USING (true);
DROP POLICY IF EXISTS "form_questions_read" ON public.operations_form_questions;
CREATE POLICY "form_questions_read" ON public.operations_form_questions FOR SELECT USING (true);
DROP POLICY IF EXISTS "form_options_read" ON public.operations_form_options;
CREATE POLICY "form_options_read" ON public.operations_form_options FOR SELECT USING (true);
DROP POLICY IF EXISTS "form_rules_read" ON public.operations_form_rules;
CREATE POLICY "form_rules_read" ON public.operations_form_rules FOR SELECT USING (true);
DROP POLICY IF EXISTS "workflow_versions_read" ON public.operations_workflow_versions;
CREATE POLICY "workflow_versions_read" ON public.operations_workflow_versions FOR SELECT USING (true);
DROP POLICY IF EXISTS "workflow_states_read" ON public.operations_workflow_states;
CREATE POLICY "workflow_states_read" ON public.operations_workflow_states FOR SELECT USING (true);
DROP POLICY IF EXISTS "workflow_transitions_read" ON public.operations_workflow_transitions;
CREATE POLICY "workflow_transitions_read" ON public.operations_workflow_transitions FOR SELECT USING (true);
DROP POLICY IF EXISTS "workflow_actions_read" ON public.operations_workflow_actions;
CREATE POLICY "workflow_actions_read" ON public.operations_workflow_actions FOR SELECT USING (true);
DROP POLICY IF EXISTS "buckets_read" ON public.operations_buckets;
CREATE POLICY "buckets_read" ON public.operations_buckets FOR SELECT USING (true);

-- ================================================================================
-- 9. PHASE 13 — EVENTS
-- FIX: partial index using NOW() in event_schedules → replaced with plain index
-- ================================================================================

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

CREATE INDEX IF NOT EXISTS idx_events_community
    ON public.event_events(community_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_public_id
    ON public.event_events(public_id) WHERE public_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_owner
    ON public.event_events(owner_identity_id);

DROP TRIGGER IF EXISTS trg_events_updated ON public.event_events;
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.event_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_event_public_id() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := 'EVT-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_public_id ON public.event_events;
CREATE TRIGGER trg_events_public_id BEFORE INSERT ON public.event_events
FOR EACH ROW EXECUTE FUNCTION public.set_event_public_id();

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

CREATE INDEX IF NOT EXISTS idx_schedules_event
    ON public.event_schedules(event_id, starts_at);
-- FIX: no NOW() in partial predicate — plain index on starts_at works fine
CREATE INDEX IF NOT EXISTS idx_schedules_starts_at
    ON public.event_schedules(starts_at);

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

CREATE UNIQUE INDEX IF NOT EXISTS uq_checkin_token_hash
    ON public.event_checkin_tokens(token_hash);

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
    ON public.event_reminders_schedule(status, scheduled_for) WHERE status = 'PENDING';

DROP TRIGGER IF EXISTS trg_reminders_updated ON public.event_reminders_schedule;
CREATE TRIGGER trg_reminders_updated
BEFORE UPDATE ON public.event_reminders_schedule
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Own the sequence to the correct column
DO $$
BEGIN
  BEGIN
    ALTER SEQUENCE event_registration_number_seq OWNED BY public.event_registrations.registration_number;
  EXCEPTION WHEN OTHERS THEN
    -- ignore if already owned or type mismatch
    NULL;
  END;
END $$;

ALTER TABLE public.event_events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_schedules             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_locations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registration_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_waitlist_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_checkin_tokens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_reminders_schedule    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_read" ON public.event_events;
CREATE POLICY "events_read" ON public.event_events FOR SELECT USING (
  owner_identity_id = auth.uid()
  OR (
    status IN ('PUBLISHED', 'LIVE', 'ENDED', 'ARCHIVED')
    AND (visibility = 'PUBLIC'
      OR EXISTS (SELECT 1 FROM public.community_memberships cm
        WHERE cm.community_id = event_events.community_id
          AND cm.identity_id = auth.uid() AND cm.status = 'ACTIVE'))
  )
);
DROP POLICY IF EXISTS "schedules_read" ON public.event_schedules;
CREATE POLICY "schedules_read" ON public.event_schedules FOR SELECT USING (true);
DROP POLICY IF EXISTS "locations_read" ON public.event_locations;
CREATE POLICY "locations_read" ON public.event_locations FOR SELECT USING (true);
DROP POLICY IF EXISTS "reg_config_read" ON public.event_registration_config;
CREATE POLICY "reg_config_read" ON public.event_registration_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "registrations_read" ON public.event_registrations;
CREATE POLICY "registrations_read" ON public.event_registrations FOR SELECT USING (
  identity_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.event_events e
    JOIN public.community_memberships cm ON cm.community_id = e.community_id
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE e.id = event_registrations.event_id
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER', 'ADMIN', 'MODERATOR'))
);

-- ================================================================================
-- 10. PHASE 15 — ECOSYSTEM
-- ================================================================================

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

CREATE INDEX IF NOT EXISTS idx_eco_activity_actor
    ON public.ecosystem_activity(actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_eco_activity_community
    ON public.ecosystem_activity(community_id, occurred_at DESC) WHERE community_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eco_activity_verb
    ON public.ecosystem_activity(verb, occurred_at DESC);

ALTER TABLE public.ecosystem_activity ENABLE ROW LEVEL SECURITY;

-- Phase G F8 fix: PRIVATE visibility is actor-only, not community-visible
DROP POLICY IF EXISTS "eco_activity_read" ON public.ecosystem_activity;
CREATE POLICY "eco_activity_read" ON public.ecosystem_activity FOR SELECT USING (
  visibility = 'PUBLIC'
  OR actor_id = auth.uid()
  OR (
    visibility = 'COMMUNITY'
    AND community_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.community_memberships cm
      WHERE cm.community_id = ecosystem_activity.community_id
        AND cm.identity_id = auth.uid()
        AND cm.status = 'ACTIVE'
    )
  )
);

CREATE TABLE IF NOT EXISTS public.ecosystem_recommendation_features (
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_key VARCHAR(80) NOT NULL,
    value NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (identity_id, feature_key)
);

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

ALTER TABLE public.ecosystem_recommendation_features   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecosystem_recommendation_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rec_features_own" ON public.ecosystem_recommendation_features;
CREATE POLICY "rec_features_own" ON public.ecosystem_recommendation_features FOR SELECT
  USING (identity_id = auth.uid());
DROP POLICY IF EXISTS "rec_candidates_own" ON public.ecosystem_recommendation_candidates;
CREATE POLICY "rec_candidates_own" ON public.ecosystem_recommendation_candidates FOR SELECT
  USING (identity_id = auth.uid());

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
  EXISTS (SELECT 1 FROM public.community_memberships cm
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE cm.community_id = analytics_community_daily_rollups.community_id
      AND cm.identity_id = auth.uid() AND cr.role_key IN ('OWNER','ADMIN'))
);

-- ================================================================================
-- 11. RPCs — Phase B, C, and event/poll/reaction functions from earlier phases
-- ================================================================================

-- Phase B: whitelisted atomic increment
CREATE OR REPLACE FUNCTION public.rpc_atomic_increment(
  p_table TEXT, p_id UUID, p_column TEXT, p_delta INTEGER DEFAULT 1
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new_value INTEGER;
BEGIN
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
  ) INTO v_new_value USING p_delta, p_id;
  RETURN COALESCE(v_new_value, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_increment(
  p_table TEXT, p_id UUID, p_field TEXT, p_delta INTEGER DEFAULT 1
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.rpc_atomic_increment(p_table, p_id, p_field, p_delta);
END;
$$;

-- Phase C: atomic outbox claim
CREATE OR REPLACE FUNCTION public.rpc_outbox_claim_batch(p_limit INTEGER DEFAULT 50)
RETURNS SETOF public.kernel_outbox_events LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  UPDATE public.kernel_outbox_events
     SET status = 'PROCESSING', locked_at = NOW(), attempt_count = attempt_count + 1
   WHERE id IN (
     SELECT id FROM public.kernel_outbox_events
     WHERE status = 'PENDING' AND locked_at IS NULL
     ORDER BY created_at ASC
     LIMIT p_limit
     FOR UPDATE SKIP LOCKED
   )
   RETURNING *;
END;
$$;

-- Phase C: atomic rate limit increment
CREATE OR REPLACE FUNCTION public.rpc_rate_limit_increment(
  p_bucket TEXT, p_subject TEXT, p_limit INTEGER, p_window_seconds INTEGER
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_row RECORD;
BEGIN
  INSERT INTO public.kernel_rate_limits (bucket, subject, count, window_start)
  VALUES (p_bucket, p_subject, 1, v_now)
  ON CONFLICT (bucket, subject) DO UPDATE SET
    count = CASE
      WHEN kernel_rate_limits.window_start + (p_window_seconds || ' seconds')::INTERVAL < v_now THEN 1
      ELSE kernel_rate_limits.count + 1
    END,
    window_start = CASE
      WHEN kernel_rate_limits.window_start + (p_window_seconds || ' seconds')::INTERVAL < v_now THEN v_now
      ELSE kernel_rate_limits.window_start
    END
  RETURNING * INTO v_row;

  IF v_row.count > p_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 'count', v_row.count,
      'retry_after', GREATEST(1, p_window_seconds - EXTRACT(EPOCH FROM (v_now - v_row.window_start))::INTEGER)
    );
  END IF;
  RETURN jsonb_build_object('allowed', true, 'count', v_row.count, 'retry_after', NULL);
END;
$$;

-- Event RPCs
CREATE OR REPLACE FUNCTION public.rpc_event_register(
  p_event_id UUID, p_identity_id UUID, p_form_submission_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event RECORD; v_config RECORD; v_existing RECORD;
  v_reg_id UUID; v_reg_number TEXT; v_target_status TEXT;
  v_waitlist_pos INTEGER; v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_event FROM public.event_events WHERE id = p_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found' USING ERRCODE = '22023'; END IF;
  IF v_event.status <> 'PUBLISHED' THEN
    RAISE EXCEPTION 'Event is not open for registration' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_config FROM public.event_registration_config WHERE event_id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event registration not configured' USING ERRCODE = '22023'; END IF;
  IF v_config.registration_mode = 'CLOSED' THEN
    RAISE EXCEPTION 'Registration is closed' USING ERRCODE = '22023';
  END IF;
  IF v_config.registration_opens_at IS NOT NULL AND v_now < v_config.registration_opens_at THEN
    RAISE EXCEPTION 'Registration has not opened yet' USING ERRCODE = '22023';
  END IF;
  IF v_config.registration_closes_at IS NOT NULL AND v_now > v_config.registration_closes_at THEN
    RAISE EXCEPTION 'Registration deadline has passed' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing FROM public.event_registrations
    WHERE event_id = p_event_id AND identity_id = p_identity_id;
  IF FOUND THEN
    IF v_existing.status IN ('CONFIRMED', 'WAITLISTED', 'ATTENDED') THEN
      RETURN jsonb_build_object('registration_id', v_existing.id, 'status', v_existing.status, 'already_registered', true);
    END IF;
    IF v_existing.status IN ('CANCELLED', 'NO_SHOW') THEN
      DELETE FROM public.event_registrations WHERE id = v_existing.id;
    END IF;
  END IF;

  IF v_config.capacity IS NULL OR v_config.confirmed_count < v_config.capacity THEN
    v_target_status := 'CONFIRMED';
    UPDATE public.event_registration_config SET confirmed_count = confirmed_count + 1 WHERE event_id = p_event_id;
    v_reg_number := 'REG-' || LPAD(nextval('event_registration_number_seq')::TEXT, 6, '0');
  ELSIF v_config.allow_waitlist THEN
    v_target_status := 'WAITLISTED';
    UPDATE public.event_registration_config SET waitlist_count = waitlist_count + 1 WHERE event_id = p_event_id;
  ELSE
    RAISE EXCEPTION 'Event is full and waitlist disabled' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.event_registrations
    (event_id, identity_id, form_submission_id, registration_number, status, confirmed_at)
  VALUES (p_event_id, p_identity_id, p_form_submission_id, v_reg_number, v_target_status,
    CASE WHEN v_target_status = 'CONFIRMED' THEN v_now ELSE NULL END)
  RETURNING id INTO v_reg_id;

  IF v_target_status = 'WAITLISTED' THEN
    SELECT COALESCE(MAX(position), 0) + 1 INTO v_waitlist_pos
    FROM public.event_waitlist_entries WHERE event_id = p_event_id FOR UPDATE;
    INSERT INTO public.event_waitlist_entries (event_id, registration_id, identity_id, position)
    VALUES (p_event_id, v_reg_id, p_identity_id, v_waitlist_pos);
  END IF;

  RETURN jsonb_build_object(
    'registration_id', v_reg_id, 'status', v_target_status,
    'registration_number', v_reg_number, 'waitlist_position', v_waitlist_pos
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_event_cancel_registration(
  p_registration_id UUID, p_actor_id UUID, p_reason TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reg RECORD; v_freed_seat BOOLEAN := false; v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_reg FROM public.event_registrations WHERE id = p_registration_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Registration not found' USING ERRCODE = '22023'; END IF;
  IF v_reg.status = 'CANCELLED' THEN RETURN jsonb_build_object('already_cancelled', true); END IF;

  IF v_reg.status = 'CONFIRMED' THEN
    UPDATE public.event_registration_config
      SET confirmed_count = GREATEST(0, confirmed_count - 1) WHERE event_id = v_reg.event_id;
    v_freed_seat := true;
  ELSIF v_reg.status = 'WAITLISTED' THEN
    UPDATE public.event_registration_config
      SET waitlist_count = GREATEST(0, waitlist_count - 1) WHERE event_id = v_reg.event_id;
    UPDATE public.event_waitlist_entries SET status = 'CANCELLED', updated_at = v_now
      WHERE registration_id = v_reg.id;
  END IF;

  UPDATE public.event_registrations
    SET status = 'CANCELLED', cancelled_at = v_now, cancellation_reason = p_reason
    WHERE id = p_registration_id;
  RETURN jsonb_build_object('cancelled', true, 'freed_seat', v_freed_seat, 'event_id', v_reg.event_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_event_promote_waitlist(p_event_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_config RECORD; v_next RECORD; v_offer_expires TIMESTAMPTZ; v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_config FROM public.event_registration_config WHERE event_id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('promoted', false, 'reason', 'no_config'); END IF;
  IF v_config.capacity IS NULL OR v_config.confirmed_count < v_config.capacity THEN
    SELECT w.*, r.id AS reg_id INTO v_next
    FROM public.event_waitlist_entries w
    JOIN public.event_registrations r ON r.id = w.registration_id
    WHERE w.event_id = p_event_id AND w.status = 'WAITING'
    ORDER BY w.priority ASC, w.joined_at ASC, w.id ASC LIMIT 1 FOR UPDATE OF w;
    IF NOT FOUND THEN RETURN jsonb_build_object('promoted', false, 'reason', 'no_waiting'); END IF;
    v_offer_expires := v_now + (COALESCE(v_config.waitlist_offer_hours, 12) || ' hours')::INTERVAL;
    UPDATE public.event_waitlist_entries
      SET status = 'OFFERED', offered_at = v_now, offer_expires_at = v_offer_expires
      WHERE id = v_next.id;
    RETURN jsonb_build_object('promoted', true, 'offer_id', v_next.id,
      'registration_id', v_next.reg_id, 'identity_id', v_next.identity_id,
      'offer_expires_at', v_offer_expires);
  END IF;
  RETURN jsonb_build_object('promoted', false, 'reason', 'capacity_full');
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_event_accept_offer(
  p_waitlist_id UUID, p_actor_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_entry RECORD; v_config RECORD; v_now TIMESTAMPTZ := NOW(); v_reg_number TEXT;
BEGIN
  SELECT * INTO v_entry FROM public.event_waitlist_entries WHERE id = p_waitlist_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Waitlist entry not found' USING ERRCODE = '22023'; END IF;
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
    SET status = 'CONFIRMED', confirmed_at = v_now, registration_number = v_reg_number
    WHERE id = v_entry.registration_id;
  UPDATE public.event_waitlist_entries SET status = 'ACCEPTED', accepted_at = v_now WHERE id = p_waitlist_id;
  UPDATE public.event_registration_config
    SET confirmed_count = confirmed_count + 1,
        waitlist_count = GREATEST(0, waitlist_count - 1)
    WHERE event_id = v_entry.event_id;
  RETURN jsonb_build_object('accepted', true, 'registration_id', v_entry.registration_id,
    'registration_number', v_reg_number);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_event_checkin(
  p_token_hash VARCHAR, p_actor_id UUID DEFAULT NULL, p_device_id VARCHAR DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_token RECORD; v_reg RECORD; v_event RECORD; v_attendance RECORD; v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_token FROM public.event_checkin_tokens WHERE token_hash = p_token_hash;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid check-in token' USING ERRCODE = '22023'; END IF;
  IF v_token.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Check-in token revoked' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_reg FROM public.event_registrations WHERE id = v_token.registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Registration missing' USING ERRCODE = '22023'; END IF;
  IF v_reg.status NOT IN ('CONFIRMED', 'ATTENDED') THEN
    RAISE EXCEPTION 'Registration is % — not eligible', v_reg.status USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_event FROM public.event_events WHERE id = v_reg.event_id;
  IF v_event.status = 'CANCELLED' OR v_event.cancelled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Event cancelled' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_attendance FROM public.event_attendance WHERE registration_id = v_reg.id;
  IF FOUND THEN
    UPDATE public.event_attendance
      SET last_scan_at = v_now, checkin_count = checkin_count + 1 WHERE id = v_attendance.id;
    RETURN jsonb_build_object('already_checked_in', true, 'attendance_id', v_attendance.id,
      'checked_in_at', v_attendance.checked_in_at,
      'registration_number', v_reg.registration_number, 'identity_id', v_reg.identity_id);
  END IF;
  INSERT INTO public.event_attendance
    (event_id, registration_id, identity_id, status, checkin_method, recorded_by, device_id)
  VALUES (v_reg.event_id, v_reg.id, v_reg.identity_id, 'CHECKED_IN',
    CASE WHEN p_actor_id IS NULL THEN 'QR' ELSE 'MANUAL' END, p_actor_id, p_device_id)
  RETURNING * INTO v_attendance;
  UPDATE public.event_registrations SET status = 'ATTENDED' WHERE id = v_reg.id;
  RETURN jsonb_build_object('already_checked_in', false, 'attendance_id', v_attendance.id,
    'checked_in_at', v_attendance.checked_in_at,
    'registration_number', v_reg.registration_number, 'identity_id', v_reg.identity_id);
END;
$$;

-- Poll + reaction RPCs
CREATE OR REPLACE FUNCTION public.rpc_cast_poll_vote(
  p_poll_id UUID, p_option_id UUID, p_identity_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_poll RECORD; v_now TIMESTAMPTZ := NOW(); v_had_any BOOLEAN; v_had_this BOOLEAN;
BEGIN
  SELECT * INTO v_poll FROM public.community_polls_v2 WHERE id = p_poll_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Poll not found' USING ERRCODE = '22023'; END IF;
  IF v_poll.status <> 'OPEN' THEN RAISE EXCEPTION 'Poll is not open' USING ERRCODE = '22023'; END IF;
  IF v_poll.ends_at IS NOT NULL AND v_poll.ends_at < v_now THEN
    UPDATE public.community_polls_v2 SET status = 'CLOSED', closed_at = v_now WHERE id = p_poll_id;
    RAISE EXCEPTION 'Poll has ended' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_poll_options WHERE id = p_option_id AND poll_id = p_poll_id) THEN
    RAISE EXCEPTION 'Invalid option' USING ERRCODE = '22023';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.community_poll_votes
    WHERE poll_id = p_poll_id AND identity_id = p_identity_id) INTO v_had_any;
  SELECT EXISTS (SELECT 1 FROM public.community_poll_votes
    WHERE poll_id = p_poll_id AND identity_id = p_identity_id AND option_id = p_option_id) INTO v_had_this;
  IF v_had_this THEN
    DELETE FROM public.community_poll_votes
      WHERE poll_id = p_poll_id AND identity_id = p_identity_id AND option_id = p_option_id;
    UPDATE public.community_poll_options SET vote_count = GREATEST(0, vote_count - 1) WHERE id = p_option_id;
    UPDATE public.community_polls_v2 SET total_votes = GREATEST(0, total_votes - 1) WHERE id = p_poll_id;
    IF NOT EXISTS (SELECT 1 FROM public.community_poll_votes
      WHERE poll_id = p_poll_id AND identity_id = p_identity_id) THEN
      UPDATE public.community_polls_v2 SET unique_voters = GREATEST(0, unique_voters - 1) WHERE id = p_poll_id;
    END IF;
    RETURN jsonb_build_object('action', 'removed');
  END IF;
  IF NOT v_poll.multiple_choice AND v_had_any THEN
    IF NOT v_poll.allow_change_vote THEN
      RAISE EXCEPTION 'Vote change not allowed' USING ERRCODE = '22023';
    END IF;
    UPDATE public.community_poll_options SET vote_count = GREATEST(0, vote_count - 1)
      WHERE id IN (SELECT option_id FROM public.community_poll_votes
        WHERE poll_id = p_poll_id AND identity_id = p_identity_id);
    DELETE FROM public.community_poll_votes WHERE poll_id = p_poll_id AND identity_id = p_identity_id;
    UPDATE public.community_polls_v2 SET total_votes = GREATEST(0, total_votes - 1) WHERE id = p_poll_id;
  END IF;
  INSERT INTO public.community_poll_votes (poll_id, option_id, identity_id)
    VALUES (p_poll_id, p_option_id, p_identity_id);
  UPDATE public.community_poll_options SET vote_count = vote_count + 1 WHERE id = p_option_id;
  UPDATE public.community_polls_v2 SET total_votes = total_votes + 1 WHERE id = p_poll_id;
  IF NOT v_had_any THEN
    UPDATE public.community_polls_v2 SET unique_voters = unique_voters + 1 WHERE id = p_poll_id;
  END IF;
  RETURN jsonb_build_object('action', 'added');
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_toggle_reaction(
  p_target_type TEXT, p_target_id UUID, p_identity_id UUID, p_reaction_type TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_existing RECORD; v_action TEXT;
BEGIN
  SELECT * INTO v_existing FROM public.community_reactions
    WHERE target_type = p_target_type AND target_id = p_target_id AND identity_id = p_identity_id;
  IF FOUND THEN
    IF v_existing.reaction_type = p_reaction_type THEN
      DELETE FROM public.community_reactions WHERE id = v_existing.id;
      v_action := 'removed';
    ELSE
      UPDATE public.community_reactions SET reaction_type = p_reaction_type WHERE id = v_existing.id;
      v_action := 'changed';
    END IF;
  ELSE
    INSERT INTO public.community_reactions (target_type, target_id, identity_id, reaction_type)
    VALUES (p_target_type, p_target_id, p_identity_id, p_reaction_type);
    v_action := 'added';
  END IF;
  IF v_action = 'added' THEN
    IF p_target_type = 'post' THEN
      UPDATE public.community_posts_v2 SET reaction_count = reaction_count + 1 WHERE id = p_target_id;
    ELSIF p_target_type = 'comment' THEN
      UPDATE public.community_comments SET reaction_count = reaction_count + 1 WHERE id = p_target_id;
    END IF;
  ELSIF v_action = 'removed' THEN
    IF p_target_type = 'post' THEN
      UPDATE public.community_posts_v2 SET reaction_count = GREATEST(0, reaction_count - 1) WHERE id = p_target_id;
    ELSIF p_target_type = 'comment' THEN
      UPDATE public.community_comments SET reaction_count = GREATEST(0, reaction_count - 1) WHERE id = p_target_id;
    END IF;
  END IF;
  RETURN jsonb_build_object('action', v_action);
END;
$$;

-- Workflow + bucket + moderation + report priority RPCs
CREATE OR REPLACE FUNCTION public.rpc_workflow_transition(
  p_run_id UUID, p_transition_key TEXT, p_actor_id UUID, p_reason TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_run RECORD; v_transition RECORD; v_to_state RECORD; v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_run FROM public.operations_workflow_runs WHERE id = p_run_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Run not found' USING ERRCODE = '22023'; END IF;
  IF v_run.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Run already completed' USING ERRCODE = '22023'; END IF;
  SELECT t.*, s.is_terminal, s.name AS to_state_name INTO v_transition
  FROM public.operations_workflow_transitions t
  JOIN public.operations_workflow_states s ON s.id = t.to_state_id
  WHERE t.workflow_version_id = v_run.workflow_version_id
    AND t.from_state_id = v_run.current_state_id AND t.key = p_transition_key LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid transition % from current state', p_transition_key USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_to_state FROM public.operations_workflow_states WHERE id = v_transition.to_state_id;
  UPDATE public.operations_workflow_runs
    SET current_state_id = v_transition.to_state_id,
        completed_at = CASE WHEN v_to_state.is_terminal THEN v_now ELSE NULL END,
        updated_at = v_now WHERE id = p_run_id;
  INSERT INTO public.operations_workflow_history
    (run_id, from_state_id, to_state_id, transition_id, actor_id, reason)
    VALUES (p_run_id, v_run.current_state_id, v_transition.to_state_id, v_transition.id, p_actor_id, p_reason);
  RETURN jsonb_build_object('run_id', p_run_id, 'from_state_id', v_run.current_state_id,
    'to_state_id', v_transition.to_state_id, 'to_state_name', v_to_state.name,
    'is_terminal', v_to_state.is_terminal, 'transition_id', v_transition.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_bucket_move(
  p_item_id UUID, p_to_bucket_id UUID, p_actor_id UUID, p_reason TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_item RECORD; v_to_bucket RECORD; v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_item FROM public.operations_bucket_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_to_bucket FROM public.operations_buckets WHERE id = p_to_bucket_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target bucket not found' USING ERRCODE = '22023'; END IF;
  IF v_to_bucket.board_id <> v_item.board_id THEN
    RAISE EXCEPTION 'Bucket belongs to a different board' USING ERRCODE = '22023';
  END IF;
  IF v_item.bucket_id = p_to_bucket_id THEN
    RETURN jsonb_build_object('moved', false, 'reason', 'already_in_bucket');
  END IF;
  UPDATE public.operations_bucket_items SET bucket_id = p_to_bucket_id, updated_at = v_now, position = 0
    WHERE id = p_item_id;
  INSERT INTO public.operations_bucket_history (item_id, from_bucket_id, to_bucket_id, actor_id, reason)
    VALUES (p_item_id, v_item.bucket_id, p_to_bucket_id, p_actor_id, p_reason);
  IF v_to_bucket.linked_state_id IS NOT NULL AND v_item.workflow_run_id IS NOT NULL THEN
    UPDATE public.operations_workflow_runs
      SET current_state_id = v_to_bucket.linked_state_id, updated_at = v_now
      WHERE id = v_item.workflow_run_id;
  END IF;
  RETURN jsonb_build_object('moved', true, 'from_bucket_id', v_item.bucket_id, 'to_bucket_id', p_to_bucket_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_compute_report_priority(
  p_reason TEXT, p_target_type TEXT, p_target_id UUID, p_community_id UUID
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_score INTEGER := 0; v_report_count INTEGER;
BEGIN
  v_score := CASE p_reason
    WHEN 'ILLEGAL_CONTENT' THEN 100 WHEN 'HATE' THEN 80 WHEN 'HARASSMENT' THEN 70
    WHEN 'ABUSE' THEN 65 WHEN 'IMPERSONATION' THEN 60 WHEN 'SCAM' THEN 55
    WHEN 'MISINFORMATION' THEN 40 WHEN 'SPAM' THEN 30 WHEN 'OFF_TOPIC' THEN 15 ELSE 20 END;
  SELECT COUNT(*) INTO v_report_count FROM public.community_reports
    WHERE target_type = p_target_type AND target_id = p_target_id AND community_id = p_community_id;
  v_score := v_score + LEAST(30, v_report_count * 5);
  RETURN v_score;
END;
$$;

-- Phase G: fixed moderation expiry — restores memberships properly
CREATE OR REPLACE FUNCTION public.rpc_expire_moderation_actions() RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bans_expired INTEGER := 0; v_restrictions_expired INTEGER := 0; v_total INTEGER;
BEGIN
  UPDATE public.community_member_restrictions
    SET ends_at = NOW() WHERE ends_at IS NOT NULL AND ends_at < NOW() AND ends_at > NOW() - INTERVAL '5 minutes';

  WITH expired_bans AS (
    SELECT community_id, identity_id FROM public.community_bans
    WHERE expires_at IS NOT NULL AND expires_at < NOW()
  ), deleted AS (
    DELETE FROM public.community_bans
    WHERE (community_id, identity_id) IN (SELECT community_id, identity_id FROM expired_bans)
    RETURNING community_id, identity_id
  )
  UPDATE public.community_memberships m
    SET status = 'ACTIVE', banned_at = NULL, joined_at = NOW()
    FROM deleted d
    WHERE m.community_id = d.community_id
      AND m.identity_id = d.identity_id
      AND m.status = 'BANNED';

  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN v_total;
END;
$$;

-- ================================================================================
-- 12. REALTIME PUBLICATIONS
-- ================================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='community_memberships') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_memberships;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='community_applications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_applications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='community_activity_projection') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_activity_projection;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='community_posts_v2') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts_v2;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='community_announcements') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_announcements;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='community_comments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='community_moderation_cases') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_moderation_cases;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='event_registrations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_registrations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='event_attendance') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_attendance;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='ecosystem_activity') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ecosystem_activity;
  END IF;
END $$;

-- ================================================================================
-- 13. VERIFICATION REPORT
-- ================================================================================

DO $$
DECLARE
  v_community_count INTEGER;
  v_memberships_count INTEGER;
  v_roles_count INTEGER;
  v_permissions_count INTEGER;
  v_settings_count INTEGER;
  v_follows_v2_count INTEGER;
  v_notifications_synced INTEGER;
  v_notifications_total INTEGER;
  v_kernel_tables_ok INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_community_count FROM public.communities;
  SELECT COUNT(*) INTO v_memberships_count FROM public.community_memberships;
  SELECT COUNT(*) INTO v_roles_count FROM public.community_roles;
  SELECT COUNT(*) INTO v_permissions_count FROM public.community_role_permissions;
  SELECT COUNT(*) INTO v_settings_count FROM public.community_settings;
  SELECT COUNT(*) INTO v_follows_v2_count FROM public.community_follows_v2;
  SELECT COUNT(*) INTO v_notifications_total FROM public.notifications;
  SELECT COUNT(*) INTO v_notifications_synced FROM public.notifications WHERE recipient_id IS NOT NULL;
  SELECT COUNT(*) INTO v_kernel_tables_ok FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'kernel_outbox_events','kernel_audit_logs','kernel_event_consumptions',
        'kernel_jobs','kernel_feature_flags','kernel_idempotency_keys',
        'kernel_rate_limits','kernel_search_index_queue','notifications','files'
      );

  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'DSRT MASTER MIGRATION — VERIFICATION REPORT';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Kernel tables present:      % / 10', v_kernel_tables_ok;
  RAISE NOTICE 'Communities:                %', v_community_count;
  RAISE NOTICE 'Memberships (new):          %', v_memberships_count;
  RAISE NOTICE 'System roles (expect 4x):   %', v_roles_count;
  RAISE NOTICE 'Role permissions granted:   %', v_permissions_count;
  RAISE NOTICE 'Community settings rows:    %', v_settings_count;
  RAISE NOTICE 'Community follows_v2 rows:  %', v_follows_v2_count;
  RAISE NOTICE 'Notifications total:        %', v_notifications_total;
  RAISE NOTICE 'Notifications w/ recipient: % (should equal total)', v_notifications_synced;
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'DONE. If all rows look reasonable, migration succeeded.';
  RAISE NOTICE '';
END $$;