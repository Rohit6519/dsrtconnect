import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ═══════════════════════════════════════════════════════════════════════════
// EDITABLE FIELD ALLOW-LIST
// Every field the owner can PATCH via this route. Everything else silently
// stripped. Server-side is the ONLY source of truth for what's writable.
// ═══════════════════════════════════════════════════════════════════════════

const EDITABLE_FIELDS = new Set([
  // Identity
  'name', 'short_description', 'description', 'tagline', 'about_content',
  'logo_url', 'cover_image_url', 'icon', 'color',

  // Classification
  'stage', 'status', 'industry', 'sector', 'category', 'tech_stack',
  'project_type', 'founded_date', 'location',
  'goals', 'risk_level',

  // Visibility (mutually synced below)
  'visibility', 'is_public', 'show_in_explore',

  // Permissions
  'messaging_permission', 'application_permission',
  'allow_recommendations', 'allow_builder_matching',

  // Team meta
  'team_size', 'open_roles', 'recruiting_count',

  // UI state
  'completion_dismissed',

  // ═══ INTELLECTUAL PROPERTY (Phase 1 additions) ═══
  'is_open_source',
  'license',
  'patent_status',
  'research_status',
  'has_proprietary_tech',
  'ip_ownership',
  'commercial_use',
])

// Validation sets (must match DB CHECK constraints)
const VALID_STAGES = new Set([
  'idea', 'research', 'planning', 'prototype', 'mvp',
  'beta', 'production', 'scaling', 'completed', 'on-hold',
])
const VALID_STATUSES = new Set(['active', 'draft', 'archived', 'completed', 'on-hold'])
const VALID_VISIBILITY = new Set(['public', 'unlisted', 'private', 'draft'])
const VALID_PATENT = new Set(['none', 'pending', 'granted', 'filed'])
const VALID_RESEARCH = new Set(['none', 'ongoing', 'published', 'peer_reviewed'])
const VALID_IP_OWNERSHIP = new Set(['founder', 'organization', 'shared', 'university', 'public_domain'])
const VALID_COMMERCIAL = new Set(['commercial', 'non-commercial', 'dual', 'not_specified'])
const VALID_RISK = new Set(['low', 'medium', 'high'])
const VALID_MSG_PERM = new Set(['anyone', 'team', 'nobody'])
const VALID_APP_PERM = new Set(['anyone', 'verified', 'invited', 'nobody'])
const VALID_PROJECT_TYPE = new Set([
  'personal', 'startup', 'research', 'hackathon', 'open-source',
  'learning', 'portfolio', 'client-work', 'mvp', 'bootcamp',
  'case-study', 'community', 'creative', 'experiment', 'software',
])

// ═══════════════════════════════════════════════════════════════════════════
// GET — project detail (delegates to RPC that enforces access gate)
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const { data, error } = await supabase.rpc('get_project_detail', {
      p_slug: slug,
      p_viewer_id: user?.id || null,
    })

    if (error) {
      console.error('[project:GET] RPC error:', error)
      throw error
    }

    if (!data) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // RPC-embedded errors
    if (data.error) {
      const status = data.code === 'forbidden' ? 403 : data.code === 'not_found' ? 404 : 400
      return NextResponse.json(data, { status })
    }

    // Fire-and-forget: activity signal for non-owner viewer
    if (user?.id && data?.project?.id && !data.is_owner) {
      supabase
        .from('user_activity_signals')
        .insert({
          user_id: user.id,
          signal_type: 'view_detail',
          entity_type: 'project',
          entity_id: data.project.id,
          weight: 2.0,
        })
        .then(() => {}, () => {})
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[project:GET] Fatal:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to load project' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUT — update project (owner only)
// ═══════════════════════════════════════════════════════════════════════════

export async function PUT(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    // ─── 1. Filter to allowed fields ───────────────────────────────
    const patch: Record<string, any> = {}
    for (const key of Object.keys(body || {})) {
      if (EDITABLE_FIELDS.has(key)) {
        patch[key] = body[key]
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
    }

    // ─── 2. Type coercions ─────────────────────────────────────────
    if ('is_open_source' in patch) {
      patch.is_open_source = patch.is_open_source === true || patch.is_open_source === 'true'
    }
    if ('has_proprietary_tech' in patch) {
      patch.has_proprietary_tech = patch.has_proprietary_tech === true || patch.has_proprietary_tech === 'true'
    }
    if ('is_public' in patch) {
      patch.is_public = patch.is_public === true || patch.is_public === 'true'
    }
    if ('show_in_explore' in patch) {
      patch.show_in_explore = patch.show_in_explore === true || patch.show_in_explore === 'true'
    }
    if ('allow_recommendations' in patch) {
      patch.allow_recommendations = patch.allow_recommendations === true || patch.allow_recommendations === 'true'
    }
    if ('allow_builder_matching' in patch) {
      patch.allow_builder_matching = patch.allow_builder_matching === true || patch.allow_builder_matching === 'true'
    }
    if ('completion_dismissed' in patch) {
      patch.completion_dismissed = patch.completion_dismissed === true || patch.completion_dismissed === 'true'
    }
    if ('team_size' in patch) {
      const n = parseInt(patch.team_size)
      patch.team_size = isNaN(n) ? 1 : Math.max(1, Math.min(999, n))
    }
    if ('open_roles' in patch) {
      const n = parseInt(patch.open_roles)
      patch.open_roles = isNaN(n) ? 0 : Math.max(0, Math.min(99, n))
    }
    if ('recruiting_count' in patch) {
      const n = parseInt(patch.recruiting_count)
      patch.recruiting_count = isNaN(n) ? 0 : Math.max(0, Math.min(99, n))
    }

    // ─── 3. Enum validation (drop invalid values, don't reject) ────
    if ('stage' in patch && !VALID_STAGES.has(patch.stage)) delete patch.stage
    if ('status' in patch && !VALID_STATUSES.has(patch.status)) delete patch.status
    if ('visibility' in patch && !VALID_VISIBILITY.has(patch.visibility)) delete patch.visibility
    if ('patent_status' in patch && !VALID_PATENT.has(patch.patent_status)) delete patch.patent_status
    if ('research_status' in patch && !VALID_RESEARCH.has(patch.research_status)) delete patch.research_status
    if ('ip_ownership' in patch && !VALID_IP_OWNERSHIP.has(patch.ip_ownership)) delete patch.ip_ownership
    if ('commercial_use' in patch && !VALID_COMMERCIAL.has(patch.commercial_use)) delete patch.commercial_use
    if ('risk_level' in patch && !VALID_RISK.has(patch.risk_level)) delete patch.risk_level
    if ('messaging_permission' in patch && !VALID_MSG_PERM.has(patch.messaging_permission)) delete patch.messaging_permission
    if ('application_permission' in patch && !VALID_APP_PERM.has(patch.application_permission)) delete patch.application_permission
    if ('project_type' in patch && !VALID_PROJECT_TYPE.has(patch.project_type)) delete patch.project_type

    // ─── 4. Array field normalization ──────────────────────────────
    if ('category' in patch) {
      patch.category = Array.isArray(patch.category)
        ? patch.category.filter((x: any) => typeof x === 'string').slice(0, 20)
        : []
    }
    if ('tech_stack' in patch) {
      patch.tech_stack = Array.isArray(patch.tech_stack)
        ? patch.tech_stack.filter((x: any) => typeof x === 'string').slice(0, 30)
        : []
    }

    // ─── 5. String length caps ─────────────────────────────────────
    const STRING_CAPS: Record<string, number> = {
      name: 120,
      short_description: 280,
      tagline: 200,
      description: 5000,
      about_content: 20000,
      goals: 2000,
      industry: 100,
      sector: 100,
      location: 100,
      license: 60,
      logo_url: 1000,
      cover_image_url: 1000,
      icon: 20,
      color: 30,
    }
    for (const [field, cap] of Object.entries(STRING_CAPS)) {
      if (field in patch && typeof patch[field] === 'string') {
        patch[field] = patch[field].slice(0, cap)
      }
    }

    // ─── 6. Sync visibility <-> is_public ──────────────────────────
    // Whichever the client sent, the other is derived so they never disagree.
    if ('visibility' in patch) {
      patch.is_public = patch.visibility === 'public'
      // Unlisted / private / draft ⇒ never show in explore
      if (patch.visibility !== 'public' && !('show_in_explore' in patch)) {
        patch.show_in_explore = false
      }
    } else if ('is_public' in patch) {
      // Only auto-set visibility if client didn't send it
      if (patch.is_public === true) {
        patch.visibility = 'public'
      } else {
        // Preserve unlisted vs private (fetched below)
        patch.visibility = 'private'
      }
    }

    // Drafts should never be marked public
    if ('status' in patch && patch.status === 'draft') {
      patch.is_public = false
      patch.visibility = 'draft'
      patch.show_in_explore = false
    }

    // ─── 7. Add server-managed timestamps ──────────────────────────
    patch.updated_at = new Date().toISOString()
    patch.last_activity_at = new Date().toISOString()

    // ─── 8. Load project + ownership check ─────────────────────────
    const { data: project, error: fetchErr } = await supabase
      .from('projects')
      .select('id, founder_id, user_id, slug, published_at, visibility, is_public, status')
      .eq('slug', slug)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const isOwner = project.founder_id === user.id || project.user_id === user.id
    if (!isOwner) {
      return NextResponse.json({ error: 'Only the project owner can edit' }, { status: 403 })
    }

    // ─── 9. Set published_at on first publish ──────────────────────
    if (patch.is_public === true && !project.published_at) {
      patch.published_at = new Date().toISOString()
    }

    // Preserve `unlisted` when client sends only `is_public=false`
    if ('is_public' in patch && !('visibility' in body) && patch.is_public === false) {
      if (project.visibility === 'unlisted') {
        patch.visibility = 'unlisted'
      }
    }

    // ─── 10. Update ────────────────────────────────────────────────
    const { data: updated, error: updateErr } = await supabase
      .from('projects')
      .update(patch)
      .eq('id', project.id)
      .select()
      .single()

    if (updateErr) {
      console.error('[project:PUT] Update error:', updateErr)
      if ((updateErr as any).code === '42703') {
        return NextResponse.json(
          { error: 'Database schema is out of date. Please run pending migrations.' },
          { status: 500 }
        )
      }
      if ((updateErr as any).code === '23514') {
        return NextResponse.json(
          { error: 'Invalid value — check field constraints' },
          { status: 400 }
        )
      }
      throw updateErr
    }

    return NextResponse.json({ success: true, project: updated })
  } catch (error: any) {
    console.error('[project:PUT] Fatal:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update project' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE — archive project (soft delete, owner only)
// ═══════════════════════════════════════════════════════════════════════════

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: project, error: fetchErr } = await supabase
      .from('projects')
      .select('id, founder_id, user_id, status')
      .eq('slug', slug)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const isOwner = project.founder_id === user.id || project.user_id === user.id
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (project.status === 'archived') {
      return NextResponse.json({ success: true, alreadyArchived: true })
    }

    const { error: updateErr } = await supabase
      .from('projects')
      .update({
        status: 'archived',
        is_public: false,
        visibility: 'private',
        show_in_explore: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[project:DELETE] Fatal:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to archive project' },
      { status: 500 }
    )
  }
}