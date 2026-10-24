-- ====================================================================================
-- PHASE 12: OPERATIONS ENGINE — Forms + Workflows + Buckets
-- Fully idempotent.
-- ====================================================================================

-- ────────────────────────────────────────────────────────────────────────────────────
-- 1. FORMS
-- ────────────────────────────────────────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_forms_community ON public.operations_forms(community_id, status);
CREATE INDEX IF NOT EXISTS idx_forms_owner ON public.operations_forms(owner_identity_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_forms_key_per_community
    ON public.operations_forms(community_id, key) WHERE community_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_forms_updated ON public.operations_forms;
CREATE TRIGGER trg_forms_updated
BEFORE UPDATE ON public.operations_forms
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

CREATE INDEX IF NOT EXISTS idx_form_versions_form ON public.operations_form_versions(form_id, version_number DESC);

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

CREATE INDEX IF NOT EXISTS idx_form_sections_version ON public.operations_form_sections(form_version_id, position);

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

CREATE INDEX IF NOT EXISTS idx_form_questions_version ON public.operations_form_questions(form_version_id, position);
CREATE INDEX IF NOT EXISTS idx_form_questions_section ON public.operations_form_questions(section_id, position);

CREATE TABLE IF NOT EXISTS public.operations_form_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.operations_form_questions(id) ON DELETE CASCADE,
    value VARCHAR(200) NOT NULL,
    label VARCHAR(300) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_form_options_question ON public.operations_form_options(question_id, position);

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

CREATE INDEX IF NOT EXISTS idx_form_rules_version ON public.operations_form_rules(form_version_id);

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

CREATE INDEX IF NOT EXISTS idx_form_submissions_form ON public.operations_form_submissions(form_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_identity ON public.operations_form_submissions(identity_id, status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_parent ON public.operations_form_submissions(parent_entity_type, parent_entity_id);

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

CREATE INDEX IF NOT EXISTS idx_form_answers_file ON public.operations_form_answers(file_id) WHERE file_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────────────
-- 2. WORKFLOW ENGINE
-- ────────────────────────────────────────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_workflows_community ON public.operations_workflows(community_id, status);

DROP TRIGGER IF EXISTS trg_workflows_updated ON public.operations_workflows;
CREATE TRIGGER trg_workflows_updated
BEFORE UPDATE ON public.operations_workflows
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

CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow ON public.operations_workflow_versions(workflow_id, version_number DESC);

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

CREATE INDEX IF NOT EXISTS idx_workflow_states_version ON public.operations_workflow_states(workflow_version_id, position);

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

CREATE INDEX IF NOT EXISTS idx_workflow_transitions_from ON public.operations_workflow_transitions(from_state_id);

-- Registry of allowed workflow actions
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

CREATE INDEX IF NOT EXISTS idx_workflow_actions_transition ON public.operations_workflow_actions(transition_id, position);

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

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON public.operations_workflow_runs(workflow_id, current_state_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_target ON public.operations_workflow_runs(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_subject ON public.operations_workflow_runs(subject_identity_id);

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

CREATE INDEX IF NOT EXISTS idx_workflow_history_run ON public.operations_workflow_history(run_id, created_at ASC);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 3. BUCKET ENGINE
-- ────────────────────────────────────────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_bucket_boards_parent ON public.operations_bucket_boards(parent_entity_type, parent_entity_id);
CREATE INDEX IF NOT EXISTS idx_bucket_boards_community ON public.operations_bucket_boards(community_id);

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

CREATE INDEX IF NOT EXISTS idx_buckets_board ON public.operations_buckets(board_id, position);

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

CREATE INDEX IF NOT EXISTS idx_bucket_items_bucket ON public.operations_bucket_items(bucket_id, position);
CREATE INDEX IF NOT EXISTS idx_bucket_items_target ON public.operations_bucket_items(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_bucket_items_run ON public.operations_bucket_items(workflow_run_id);

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

CREATE INDEX IF NOT EXISTS idx_bucket_history_item ON public.operations_bucket_history(item_id, created_at ASC);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 4. CONCURRENCY-SAFE RPCs
-- ────────────────────────────────────────────────────────────────────────────────────

-- Atomic workflow transition
CREATE OR REPLACE FUNCTION public.rpc_workflow_transition(
  p_run_id UUID,
  p_transition_key TEXT,
  p_actor_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_run RECORD;
  v_transition RECORD;
  v_to_state RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_run FROM public.operations_workflow_runs WHERE id = p_run_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Run not found' USING ERRCODE = '22023'; END IF;
  IF v_run.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Run already completed' USING ERRCODE = '22023'; END IF;

  SELECT t.*, s.is_terminal, s.name AS to_state_name INTO v_transition
  FROM public.operations_workflow_transitions t
  JOIN public.operations_workflow_states s ON s.id = t.to_state_id
  WHERE t.workflow_version_id = v_run.workflow_version_id
    AND t.from_state_id = v_run.current_state_id
    AND t.key = p_transition_key
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid transition % from current state', p_transition_key USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_to_state FROM public.operations_workflow_states WHERE id = v_transition.to_state_id;

  UPDATE public.operations_workflow_runs
     SET current_state_id = v_transition.to_state_id,
         completed_at = CASE WHEN v_to_state.is_terminal THEN v_now ELSE NULL END,
         updated_at = v_now
   WHERE id = p_run_id;

  INSERT INTO public.operations_workflow_history (run_id, from_state_id, to_state_id, transition_id, actor_id, reason)
  VALUES (p_run_id, v_run.current_state_id, v_transition.to_state_id, v_transition.id, p_actor_id, p_reason);

  RETURN jsonb_build_object(
    'run_id', p_run_id,
    'from_state_id', v_run.current_state_id,
    'to_state_id', v_transition.to_state_id,
    'to_state_name', v_to_state.name,
    'is_terminal', v_to_state.is_terminal,
    'transition_id', v_transition.id
  );
END;
$$;

-- Atomic bucket move
CREATE OR REPLACE FUNCTION public.rpc_bucket_move(
  p_item_id UUID,
  p_to_bucket_id UUID,
  p_actor_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_to_bucket RECORD;
  v_now TIMESTAMPTZ := NOW();
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

  UPDATE public.operations_bucket_items
     SET bucket_id = p_to_bucket_id, updated_at = v_now, position = 0
   WHERE id = p_item_id;

  INSERT INTO public.operations_bucket_history (item_id, from_bucket_id, to_bucket_id, actor_id, reason)
  VALUES (p_item_id, v_item.bucket_id, p_to_bucket_id, p_actor_id, p_reason);

  -- If bucket is linked to a workflow state and item has a run, advance it
  IF v_to_bucket.linked_state_id IS NOT NULL AND v_item.workflow_run_id IS NOT NULL THEN
    UPDATE public.operations_workflow_runs
       SET current_state_id = v_to_bucket.linked_state_id, updated_at = v_now
     WHERE id = v_item.workflow_run_id;
    INSERT INTO public.operations_workflow_history (run_id, from_state_id, to_state_id, actor_id, reason)
    SELECT v_item.workflow_run_id, r.current_state_id, v_to_bucket.linked_state_id, p_actor_id, p_reason
    FROM public.operations_workflow_runs r WHERE r.id = v_item.workflow_run_id;
  END IF;

  RETURN jsonb_build_object('moved', true, 'from_bucket_id', v_item.bucket_id, 'to_bucket_id', p_to_bucket_id);
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────────────
-- 5. RLS
-- ────────────────────────────────────────────────────────────────────────────────────

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

-- Action registry is world-readable
DROP POLICY IF EXISTS "action_registry_read" ON public.operations_workflow_action_registry;
CREATE POLICY "action_registry_read" ON public.operations_workflow_action_registry FOR SELECT USING (true);

-- Forms — owner + community admins + published forms readable to community members
DROP POLICY IF EXISTS "forms_read" ON public.operations_forms;
CREATE POLICY "forms_read" ON public.operations_forms FOR SELECT USING (
  owner_identity_id = auth.uid()
  OR (community_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.community_memberships cm
    WHERE cm.community_id = operations_forms.community_id
      AND cm.identity_id = auth.uid()
      AND cm.status = 'ACTIVE'
  ))
);

DROP POLICY IF EXISTS "forms_insert_own" ON public.operations_forms;
CREATE POLICY "forms_insert_own" ON public.operations_forms FOR INSERT
  WITH CHECK (owner_identity_id = auth.uid());

DROP POLICY IF EXISTS "forms_update_own" ON public.operations_forms;
CREATE POLICY "forms_update_own" ON public.operations_forms FOR UPDATE USING (owner_identity_id = auth.uid());

-- Form versions/sections/questions/options/rules — read follows form
DROP POLICY IF EXISTS "form_versions_read" ON public.operations_form_versions;
CREATE POLICY "form_versions_read" ON public.operations_form_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.operations_forms f WHERE f.id = operations_form_versions.form_id)
);

DROP POLICY IF EXISTS "form_sections_read" ON public.operations_form_sections;
CREATE POLICY "form_sections_read" ON public.operations_form_sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "form_questions_read" ON public.operations_form_questions;
CREATE POLICY "form_questions_read" ON public.operations_form_questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "form_options_read" ON public.operations_form_options;
CREATE POLICY "form_options_read" ON public.operations_form_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "form_rules_read" ON public.operations_form_rules;
CREATE POLICY "form_rules_read" ON public.operations_form_rules FOR SELECT USING (true);

-- Submissions — submitter sees own; form owner + community admins see all
DROP POLICY IF EXISTS "form_submissions_read" ON public.operations_form_submissions;
CREATE POLICY "form_submissions_read" ON public.operations_form_submissions FOR SELECT USING (
  identity_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.operations_forms f
    WHERE f.id = operations_form_submissions.form_id
      AND (
        f.owner_identity_id = auth.uid()
        OR (f.community_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.community_memberships cm
          JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
          JOIN public.community_roles cr ON cr.id = mr.role_id
          WHERE cm.community_id = f.community_id
            AND cm.identity_id = auth.uid()
            AND cr.role_key IN ('OWNER','ADMIN','MODERATOR')
        ))
      )
  )
);

DROP POLICY IF EXISTS "form_submissions_insert_self" ON public.operations_form_submissions;
CREATE POLICY "form_submissions_insert_self" ON public.operations_form_submissions FOR INSERT
  WITH CHECK (identity_id = auth.uid());

DROP POLICY IF EXISTS "form_submissions_update_own" ON public.operations_form_submissions;
CREATE POLICY "form_submissions_update_own" ON public.operations_form_submissions FOR UPDATE USING (identity_id = auth.uid());

-- Answers — follow submission
DROP POLICY IF EXISTS "form_answers_read" ON public.operations_form_answers;
CREATE POLICY "form_answers_read" ON public.operations_form_answers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.operations_form_submissions s
    WHERE s.id = operations_form_answers.submission_id
      AND (
        s.identity_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.operations_forms f
          WHERE f.id = s.form_id
            AND (
              f.owner_identity_id = auth.uid()
              OR (f.community_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.community_memberships cm
                JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
                JOIN public.community_roles cr ON cr.id = mr.role_id
                WHERE cm.community_id = f.community_id
                  AND cm.identity_id = auth.uid()
                  AND cr.role_key IN ('OWNER','ADMIN','MODERATOR')
              ))
            )
        )
      )
  )
);

DROP POLICY IF EXISTS "form_answers_insert_self" ON public.operations_form_answers;
CREATE POLICY "form_answers_insert_self" ON public.operations_form_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.operations_form_submissions s
      WHERE s.id = operations_form_answers.submission_id AND s.identity_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "form_answers_update_self" ON public.operations_form_answers;
CREATE POLICY "form_answers_update_self" ON public.operations_form_answers FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.operations_form_submissions s
    WHERE s.id = operations_form_answers.submission_id AND s.identity_id = auth.uid()
  )
);

-- Workflows / states / transitions / actions — owner + community admins
DROP POLICY IF EXISTS "workflows_read" ON public.operations_workflows;
CREATE POLICY "workflows_read" ON public.operations_workflows FOR SELECT USING (
  owner_identity_id = auth.uid()
  OR is_template = true
  OR (community_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.community_memberships cm
    WHERE cm.community_id = operations_workflows.community_id
      AND cm.identity_id = auth.uid()
      AND cm.status = 'ACTIVE'
  ))
);

DROP POLICY IF EXISTS "workflows_insert_own" ON public.operations_workflows;
CREATE POLICY "workflows_insert_own" ON public.operations_workflows FOR INSERT WITH CHECK (owner_identity_id = auth.uid());

DROP POLICY IF EXISTS "workflows_update_own" ON public.operations_workflows;
CREATE POLICY "workflows_update_own" ON public.operations_workflows FOR UPDATE USING (owner_identity_id = auth.uid());

DROP POLICY IF EXISTS "workflow_versions_read" ON public.operations_workflow_versions;
CREATE POLICY "workflow_versions_read" ON public.operations_workflow_versions FOR SELECT USING (true);

DROP POLICY IF EXISTS "workflow_states_read" ON public.operations_workflow_states;
CREATE POLICY "workflow_states_read" ON public.operations_workflow_states FOR SELECT USING (true);

DROP POLICY IF EXISTS "workflow_transitions_read" ON public.operations_workflow_transitions;
CREATE POLICY "workflow_transitions_read" ON public.operations_workflow_transitions FOR SELECT USING (true);

DROP POLICY IF EXISTS "workflow_actions_read" ON public.operations_workflow_actions;
CREATE POLICY "workflow_actions_read" ON public.operations_workflow_actions FOR SELECT USING (true);

DROP POLICY IF EXISTS "workflow_runs_read" ON public.operations_workflow_runs;
CREATE POLICY "workflow_runs_read" ON public.operations_workflow_runs FOR SELECT USING (
  subject_identity_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.operations_workflows w
    WHERE w.id = operations_workflow_runs.workflow_id
      AND (
        w.owner_identity_id = auth.uid()
        OR (w.community_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.community_memberships cm
          JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
          JOIN public.community_roles cr ON cr.id = mr.role_id
          WHERE cm.community_id = w.community_id
            AND cm.identity_id = auth.uid()
            AND cr.role_key IN ('OWNER','ADMIN','MODERATOR')
        ))
      )
  )
);

DROP POLICY IF EXISTS "workflow_history_read" ON public.operations_workflow_history;
CREATE POLICY "workflow_history_read" ON public.operations_workflow_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.operations_workflow_runs r
    WHERE r.id = operations_workflow_history.run_id
      AND (
        r.subject_identity_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.operations_workflows w
          WHERE w.id = r.workflow_id AND w.owner_identity_id = auth.uid()
        )
      )
  )
);

-- Buckets — owners + community admins + item subjects
DROP POLICY IF EXISTS "bucket_boards_read" ON public.operations_bucket_boards;
CREATE POLICY "bucket_boards_read" ON public.operations_bucket_boards FOR SELECT USING (
  owner_identity_id = auth.uid()
  OR (community_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.community_memberships cm
    JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
    JOIN public.community_roles cr ON cr.id = mr.role_id
    WHERE cm.community_id = operations_bucket_boards.community_id
      AND cm.identity_id = auth.uid()
      AND cr.role_key IN ('OWNER','ADMIN','MODERATOR')
  ))
);

DROP POLICY IF EXISTS "bucket_boards_insert_own" ON public.operations_bucket_boards;
CREATE POLICY "bucket_boards_insert_own" ON public.operations_bucket_boards FOR INSERT WITH CHECK (owner_identity_id = auth.uid());

DROP POLICY IF EXISTS "bucket_boards_update_own" ON public.operations_bucket_boards;
CREATE POLICY "bucket_boards_update_own" ON public.operations_bucket_boards FOR UPDATE USING (owner_identity_id = auth.uid());

DROP POLICY IF EXISTS "buckets_read" ON public.operations_buckets;
CREATE POLICY "buckets_read" ON public.operations_buckets FOR SELECT USING (true);

DROP POLICY IF EXISTS "bucket_items_read" ON public.operations_bucket_items;
CREATE POLICY "bucket_items_read" ON public.operations_bucket_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.operations_bucket_boards b
    WHERE b.id = operations_bucket_items.board_id
      AND (
        b.owner_identity_id = auth.uid()
        OR (b.community_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.community_memberships cm
          JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
          JOIN public.community_roles cr ON cr.id = mr.role_id
          WHERE cm.community_id = b.community_id
            AND cm.identity_id = auth.uid()
            AND cr.role_key IN ('OWNER','ADMIN','MODERATOR')
        ))
      )
  )
);

DROP POLICY IF EXISTS "bucket_history_read" ON public.operations_bucket_history;
CREATE POLICY "bucket_history_read" ON public.operations_bucket_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.operations_bucket_items i
    JOIN public.operations_bucket_boards b ON b.id = i.board_id
    WHERE i.id = operations_bucket_history.item_id
      AND (
        b.owner_identity_id = auth.uid()
        OR (b.community_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.community_memberships cm
          JOIN public.community_membership_roles mr ON mr.membership_id = cm.id
          JOIN public.community_roles cr ON cr.id = mr.role_id
          WHERE cm.community_id = b.community_id
            AND cm.identity_id = auth.uid()
            AND cr.role_key IN ('OWNER','ADMIN','MODERATOR')
        ))
      )
  )
);

-- Realtime for buckets (kanban live drag support)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'operations_bucket_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.operations_bucket_items;
  END IF;
END $$;

-- DONE