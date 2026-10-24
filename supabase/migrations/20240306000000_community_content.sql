-- ====================================================================================
-- PHASE 10: COMMUNITY CONTENT — Posts, Announcements, Polls, Comments, Reactions
-- Fully idempotent. Backward-compatible with legacy community_chat_messages.
-- ====================================================================================

-- ────────────────────────────────────────────────────────────────────────────────────
-- 1. POSTS
-- ────────────────────────────────────────────────────────────────────────────────────

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

-- Attachments
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

-- Mentions
CREATE TABLE IF NOT EXISTS public.community_post_mentions (
    post_id UUID NOT NULL REFERENCES public.community_posts_v2(id) ON DELETE CASCADE,
    mentioned_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, mentioned_identity_id)
);

CREATE INDEX IF NOT EXISTS idx_post_mentions_identity
    ON public.community_post_mentions(mentioned_identity_id, created_at DESC);

-- Tags
CREATE TABLE IF NOT EXISTS public.community_post_tags (
    post_id UUID NOT NULL REFERENCES public.community_posts_v2(id) ON DELETE CASCADE,
    tag VARCHAR(60) NOT NULL,
    PRIMARY KEY (post_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON public.community_post_tags(tag);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 2. ANNOUNCEMENTS
-- ────────────────────────────────────────────────────────────────────────────────────

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

-- Read receipts (best-effort)
CREATE TABLE IF NOT EXISTS public.community_announcement_reads (
    announcement_id UUID NOT NULL REFERENCES public.community_announcements(id) ON DELETE CASCADE,
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (announcement_id, identity_id)
);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 3. POLLS
-- ────────────────────────────────────────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_polls_v2_community ON public.community_polls_v2(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_v2_post ON public.community_polls_v2(post_id);

DROP TRIGGER IF EXISTS trg_polls_v2_updated ON public.community_polls_v2;
CREATE TRIGGER trg_polls_v2_updated
BEFORE UPDATE ON public.community_polls_v2
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FK from posts.poll_id (deferred so both tables exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'community_posts_v2_poll_id_fkey'
      AND table_name = 'community_posts_v2'
  ) THEN
    ALTER TABLE public.community_posts_v2
      ADD CONSTRAINT community_posts_v2_poll_id_fkey
      FOREIGN KEY (poll_id) REFERENCES public.community_polls_v2(id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.community_poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.community_polls_v2(id) ON DELETE CASCADE,
    label VARCHAR(200) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    vote_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON public.community_poll_options(poll_id, position);

CREATE TABLE IF NOT EXISTS public.community_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.community_polls_v2(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.community_poll_options(id) ON DELETE CASCADE,
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Concurrency-safe: prevent same identity voting twice for same option (multi-choice safe)
CREATE UNIQUE INDEX IF NOT EXISTS uq_poll_vote_identity_option
    ON public.community_poll_votes(poll_id, identity_id, option_id);

CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON public.community_poll_votes(option_id);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 4. COMMENTS + REACTIONS
-- ────────────────────────────────────────────────────────────────────────────────────

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

-- Reactions (polymorphic, controlled set of reaction types)
CREATE TABLE IF NOT EXISTS public.community_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(30) NOT NULL,
    target_id UUID NOT NULL,
    identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One reaction per user per target (any type change replaces prior)
CREATE UNIQUE INDEX IF NOT EXISTS uq_reactions_unique
    ON public.community_reactions(target_type, target_id, identity_id);

CREATE INDEX IF NOT EXISTS idx_reactions_target
    ON public.community_reactions(target_type, target_id, created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 5. RPCs — atomic counters + polls
-- ────────────────────────────────────────────────────────────────────────────────────

-- Increment a counter safely
CREATE OR REPLACE FUNCTION public.rpc_increment(
  p_table TEXT,
  p_id UUID,
  p_field TEXT,
  p_delta INTEGER DEFAULT 1
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('UPDATE public.%I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2', p_table, p_field, p_field)
  USING p_delta, p_id;
END;
$$;

-- Atomic poll vote (handles single + multi choice + change-vote)
CREATE OR REPLACE FUNCTION public.rpc_cast_poll_vote(
  p_poll_id UUID,
  p_option_id UUID,
  p_identity_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_poll RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_had_any BOOLEAN;
  v_had_this BOOLEAN;
BEGIN
  -- Lock poll row
  SELECT * INTO v_poll FROM public.community_polls_v2 WHERE id = p_poll_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found' USING ERRCODE = '22023';
  END IF;

  IF v_poll.status <> 'OPEN' THEN
    RAISE EXCEPTION 'Poll is not open' USING ERRCODE = '22023';
  END IF;

  IF v_poll.ends_at IS NOT NULL AND v_poll.ends_at < v_now THEN
    UPDATE public.community_polls_v2 SET status = 'CLOSED', closed_at = v_now WHERE id = p_poll_id;
    RAISE EXCEPTION 'Poll has ended' USING ERRCODE = '22023';
  END IF;

  -- Validate option belongs to poll
  IF NOT EXISTS (SELECT 1 FROM public.community_poll_options WHERE id = p_option_id AND poll_id = p_poll_id) THEN
    RAISE EXCEPTION 'Invalid option' USING ERRCODE = '22023';
  END IF;

  -- Check existing votes
  SELECT EXISTS (SELECT 1 FROM public.community_poll_votes WHERE poll_id = p_poll_id AND identity_id = p_identity_id) INTO v_had_any;
  SELECT EXISTS (SELECT 1 FROM public.community_poll_votes WHERE poll_id = p_poll_id AND identity_id = p_identity_id AND option_id = p_option_id) INTO v_had_this;

  IF v_had_this THEN
    -- Remove this vote (toggle off)
    DELETE FROM public.community_poll_votes WHERE poll_id = p_poll_id AND identity_id = p_identity_id AND option_id = p_option_id;
    UPDATE public.community_poll_options SET vote_count = GREATEST(0, vote_count - 1) WHERE id = p_option_id;
    UPDATE public.community_polls_v2 SET total_votes = GREATEST(0, total_votes - 1) WHERE id = p_poll_id;
    -- Update unique_voters if no more votes from this identity
    IF NOT EXISTS (SELECT 1 FROM public.community_poll_votes WHERE poll_id = p_poll_id AND identity_id = p_identity_id) THEN
      UPDATE public.community_polls_v2 SET unique_voters = GREATEST(0, unique_voters - 1) WHERE id = p_poll_id;
    END IF;
    RETURN jsonb_build_object('action', 'removed');
  END IF;

  -- If single choice + already voted → change vote
  IF NOT v_poll.multiple_choice AND v_had_any THEN
    IF NOT v_poll.allow_change_vote THEN
      RAISE EXCEPTION 'Vote change not allowed' USING ERRCODE = '22023';
    END IF;
    -- Remove previous vote
    UPDATE public.community_poll_options
      SET vote_count = GREATEST(0, vote_count - 1)
      WHERE id IN (SELECT option_id FROM public.community_poll_votes WHERE poll_id = p_poll_id AND identity_id = p_identity_id);
    DELETE FROM public.community_poll_votes WHERE poll_id = p_poll_id AND identity_id = p_identity_id;
    UPDATE public.community_polls_v2 SET total_votes = GREATEST(0, total_votes - 1) WHERE id = p_poll_id;
  END IF;

  -- Insert new vote
  INSERT INTO public.community_poll_votes (poll_id, option_id, identity_id) VALUES (p_poll_id, p_option_id, p_identity_id);
  UPDATE public.community_poll_options SET vote_count = vote_count + 1 WHERE id = p_option_id;
  UPDATE public.community_polls_v2 SET total_votes = total_votes + 1 WHERE id = p_poll_id;

  IF NOT v_had_any THEN
    UPDATE public.community_polls_v2 SET unique_voters = unique_voters + 1 WHERE id = p_poll_id;
  END IF;

  RETURN jsonb_build_object('action', 'added');
END;
$$;

-- Atomic reaction toggle
CREATE OR REPLACE FUNCTION public.rpc_toggle_reaction(
  p_target_type TEXT,
  p_target_id UUID,
  p_identity_id UUID,
  p_reaction_type TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing RECORD;
  v_action TEXT;
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

  -- Update counter on target (posts + comments)
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

-- ────────────────────────────────────────────────────────────────────────────────────
-- 6. RLS
-- ────────────────────────────────────────────────────────────────────────────────────

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

-- Posts: public visible to all, MEMBERS visible to active members + admins
DROP POLICY IF EXISTS "posts_v2_read" ON public.community_posts_v2;
CREATE POLICY "posts_v2_read"
  ON public.community_posts_v2
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND status = 'PUBLISHED'
    AND (
      visibility = 'PUBLIC'
      OR EXISTS (
        SELECT 1 FROM public.community_memberships cm
        WHERE cm.community_id = community_posts_v2.community_id
          AND cm.identity_id = auth.uid()
          AND cm.status = 'ACTIVE'
      )
      OR author_identity_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "posts_v2_insert_member" ON public.community_posts_v2;
CREATE POLICY "posts_v2_insert_member"
  ON public.community_posts_v2
  FOR INSERT
  WITH CHECK (
    author_identity_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_memberships cm
      WHERE cm.community_id = community_posts_v2.community_id
        AND cm.identity_id = auth.uid()
        AND cm.status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "posts_v2_update_own" ON public.community_posts_v2;
CREATE POLICY "posts_v2_update_own"
  ON public.community_posts_v2
  FOR UPDATE
  USING (author_identity_id = auth.uid());

-- Attachments/mentions/tags follow post visibility
DROP POLICY IF EXISTS "post_attachments_read" ON public.community_post_attachments;
CREATE POLICY "post_attachments_read"
  ON public.community_post_attachments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.community_posts_v2 p WHERE p.id = community_post_attachments.post_id AND p.deleted_at IS NULL)
  );

DROP POLICY IF EXISTS "post_mentions_read" ON public.community_post_mentions;
CREATE POLICY "post_mentions_read"
  ON public.community_post_mentions FOR SELECT USING (true);

DROP POLICY IF EXISTS "post_tags_read" ON public.community_post_tags;
CREATE POLICY "post_tags_read"
  ON public.community_post_tags FOR SELECT USING (true);

-- Announcements: PUBLIC visible to all, otherwise members-only
DROP POLICY IF EXISTS "announcements_read" ON public.community_announcements;
CREATE POLICY "announcements_read"
  ON public.community_announcements
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND status = 'PUBLISHED'
    AND (
      EXISTS (
        SELECT 1 FROM public.community_memberships cm
        WHERE cm.community_id = community_announcements.community_id
          AND cm.identity_id = auth.uid()
          AND cm.status = 'ACTIVE'
      )
      OR EXISTS (
        SELECT 1 FROM public.communities c
        WHERE c.id = community_announcements.community_id AND c.visibility = 'PUBLIC'
      )
    )
  );

DROP POLICY IF EXISTS "announcement_reads_own" ON public.community_announcement_reads;
CREATE POLICY "announcement_reads_own"
  ON public.community_announcement_reads FOR ALL
  USING (identity_id = auth.uid()) WITH CHECK (identity_id = auth.uid());

-- Polls
DROP POLICY IF EXISTS "polls_v2_read" ON public.community_polls_v2;
CREATE POLICY "polls_v2_read"
  ON public.community_polls_v2 FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_memberships cm
      WHERE cm.community_id = community_polls_v2.community_id
        AND cm.identity_id = auth.uid()
        AND cm.status = 'ACTIVE'
    )
    OR EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_polls_v2.community_id AND c.visibility = 'PUBLIC'
    )
  );

DROP POLICY IF EXISTS "poll_options_read" ON public.community_poll_options;
CREATE POLICY "poll_options_read" ON public.community_poll_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "poll_votes_read_own" ON public.community_poll_votes;
CREATE POLICY "poll_votes_read_own"
  ON public.community_poll_votes FOR SELECT
  USING (
    identity_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_polls_v2 p
      WHERE p.id = community_poll_votes.poll_id AND p.anonymous = false
    )
  );

-- Comments
DROP POLICY IF EXISTS "comments_read" ON public.community_comments;
CREATE POLICY "comments_read"
  ON public.community_comments FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.community_memberships cm
        WHERE cm.community_id = community_comments.community_id
          AND cm.identity_id = auth.uid()
          AND cm.status = 'ACTIVE'
      )
      OR EXISTS (
        SELECT 1 FROM public.communities c
        WHERE c.id = community_comments.community_id AND c.visibility = 'PUBLIC'
      )
    )
  );

DROP POLICY IF EXISTS "comments_insert_member" ON public.community_comments;
CREATE POLICY "comments_insert_member"
  ON public.community_comments FOR INSERT
  WITH CHECK (
    author_identity_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_memberships cm
      WHERE cm.community_id = community_comments.community_id
        AND cm.identity_id = auth.uid()
        AND cm.status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "comments_update_own" ON public.community_comments;
CREATE POLICY "comments_update_own"
  ON public.community_comments FOR UPDATE USING (author_identity_id = auth.uid());

-- Reactions
DROP POLICY IF EXISTS "reactions_read" ON public.community_reactions;
CREATE POLICY "reactions_read" ON public.community_reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "reactions_insert_own" ON public.community_reactions;
CREATE POLICY "reactions_insert_own"
  ON public.community_reactions FOR INSERT WITH CHECK (identity_id = auth.uid());

DROP POLICY IF EXISTS "reactions_delete_own" ON public.community_reactions;
CREATE POLICY "reactions_delete_own"
  ON public.community_reactions FOR DELETE USING (identity_id = auth.uid());

DROP POLICY IF EXISTS "reactions_update_own" ON public.community_reactions;
CREATE POLICY "reactions_update_own"
  ON public.community_reactions FOR UPDATE USING (identity_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────────────
-- 7. REALTIME
-- ────────────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_posts_v2') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts_v2;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_announcements') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_announcements;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_comments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comments;
  END IF;
END $$;

-- DONE