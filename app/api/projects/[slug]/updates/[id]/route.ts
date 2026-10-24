import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS (mirror parent route)
// ═══════════════════════════════════════════════════════════════════════════

const VALID_TYPES = new Set([
  'general', 'release', 'building', 'experiment', 'progress',
  'fix', 'announcement', 'collaboration', 'insight',
])
const VALID_RELEASE_LABELS = new Set(['none', 'pre-release', 'release'])
const MAX_PINNED_PER_PROJECT = 4

const MAX_TITLE_LEN         = 200
const MAX_CONTENT_LEN       = 10_000
const MAX_SECTION_TEXT_LEN  = 10_000
const MAX_SECTIONS          = 8
const MAX_IMAGES_TOTAL      = 4
const MAX_VIDEOS_TOTAL      = 1
const MAX_LINKS             = 8
const MAX_LINK_TITLE_LEN    = 60
const MAX_LINK_URL_LEN      = 500
const MAX_TAGS              = 10
const MAX_TAG_LEN           = 40
const MAX_ALT_TEXT_LEN      = 200
const MAX_ATTACHMENTS       = 8

// ═══════════════════════════════════════════════════════════════════════════
// SHARED SANITIZERS
// ═══════════════════════════════════════════════════════════════════════════

function isValidUrl(u: unknown): u is string {
  if (typeof u !== 'string') return false
  const s = u.trim()
  return !!s && (/^https?:\/\/.+/i.test(s) || /^mailto:.+@.+/i.test(s))
}

function isValidMediaUrl(u: unknown): u is string {
  if (typeof u !== 'string') return false
  const s = u.trim()
  return !!s && (/^https?:\/\/.+/i.test(s) || /^\/[a-z0-9]/i.test(s))
}

function safeString(v: unknown, max: number): string {
  return typeof v === 'string' ? v.slice(0, max) : ''
}

function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

function normalizeImageEntry(entry: unknown): { url: string; alt?: string } | null {
  if (typeof entry === 'string') {
    if (!isValidMediaUrl(entry)) return null
    return { url: entry.trim() }
  }
  if (entry && typeof entry === 'object') {
    const e = entry as any
    if (!isValidMediaUrl(e.url)) return null
    const img: { url: string; alt?: string } = { url: String(e.url).trim() }
    if (typeof e.alt === 'string' && e.alt.trim()) {
      img.alt = e.alt.trim().slice(0, MAX_ALT_TEXT_LEN)
    }
    return img
  }
  return null
}

function sanitizeSections(input: unknown): {
  sections: Array<{ id: string; text: string; images: Array<{ url: string; alt?: string }>; video: string | null }>
  totalImages: number
  totalVideos: number
  error?: string
} {
  const raw = safeArray<any>(input)
  if (raw.length > MAX_SECTIONS) {
    return { sections: [], totalImages: 0, totalVideos: 0, error: `Max ${MAX_SECTIONS} sections` }
  }

  let totalImages = 0
  let totalVideos = 0
  const sections: any[] = []

  for (let i = 0; i < raw.length; i++) {
    const s = raw[i] || {}
    const text = safeString(s.text, MAX_SECTION_TEXT_LEN).trim()

    const imagesRaw = safeArray<unknown>(s.images)
    const images: Array<{ url: string; alt?: string }> = []
    for (const entry of imagesRaw) {
      const img = normalizeImageEntry(entry)
      if (!img) continue
      images.push(img)
      totalImages++
      if (totalImages > MAX_IMAGES_TOTAL) {
        return { sections: [], totalImages, totalVideos, error: `Max ${MAX_IMAGES_TOTAL} images per update` }
      }
    }

    let video: string | null = null
    if (s.video && isValidMediaUrl(s.video)) {
      video = String(s.video).trim()
      totalVideos++
      if (totalVideos > MAX_VIDEOS_TOTAL) {
        return { sections: [], totalImages, totalVideos, error: `Max ${MAX_VIDEOS_TOTAL} video per update` }
      }
    }

    if (!text && images.length === 0 && !video) continue

    sections.push({
      id: typeof s.id === 'string' && s.id ? s.id.slice(0, 40) : `s${i}`,
      text,
      images,
      video,
    })
  }

  return { sections, totalImages, totalVideos }
}

function sanitizeLinks(input: unknown): {
  links: Array<{ title: string; url: string }>
  error?: string
} {
  const raw = safeArray<any>(input)
  if (raw.length > MAX_LINKS) return { links: [], error: `Max ${MAX_LINKS} links` }

  const links: Array<{ title: string; url: string }> = []
  for (const l of raw) {
    const title = safeString(l?.title, MAX_LINK_TITLE_LEN).trim()
    const url = safeString(l?.url, MAX_LINK_URL_LEN).trim()
    if (!title && !url) continue
    if (!url || !isValidUrl(url)) return { links: [], error: `Invalid URL: ${url.slice(0, 40)}` }
    if (!title) return { links: [], error: 'Every link needs a title' }
    links.push({ title, url })
  }
  return { links }
}

function sanitizeTags(input: unknown): string[] {
  const raw = safeArray<unknown>(input)
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of raw) {
    if (typeof t !== 'string') continue
    const cleaned = t.trim().replace(/^#/, '').toLowerCase().slice(0, MAX_TAG_LEN)
    if (!cleaned || seen.has(cleaned)) continue
    seen.add(cleaned)
    out.push(cleaned)
    if (out.length >= MAX_TAGS) break
  }
  return out
}

function sanitizeAttachments(input: unknown): any[] {
  const raw = safeArray<any>(input)
  const out: any[] = []
  for (const a of raw) {
    if (!a || typeof a !== 'object' || !isValidMediaUrl(a.url)) continue
    out.push({
      url: String(a.url).trim().slice(0, 500),
      name: typeof a.name === 'string' ? a.name.slice(0, 200) : 'File',
      size: typeof a.size === 'number' && a.size > 0 ? Math.floor(a.size) : 0,
      type: typeof a.type === 'string' ? a.type.slice(0, 100) : 'application/octet-stream',
    })
    if (out.length >= MAX_ATTACHMENTS) break
  }
  return out
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: fetch post + project + permission context in one round-trip
// ═══════════════════════════════════════════════════════════════════════════

async function loadPostContext(supabase: any, id: string, userId: string | undefined) {
  const { data: post, error: postErr } = await supabase
    .from('posts')
    .select('id, user_id, project_id, is_pinned, pinned_at')
    .eq('id', id)
    .maybeSingle()

  if (postErr) throw postErr
  if (!post) return { error: 'notfound' as const }

  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('id, founder_id, user_id, slug')
    .eq('id', post.project_id)
    .maybeSingle()

  if (projErr) throw projErr
  if (!project) return { error: 'notfound' as const }

  const isAuthor = !!userId && post.user_id === userId
  const isProjectOwner = !!userId && (project.founder_id === userId || project.user_id === userId)

  return { post, project, isAuthor, isProjectOwner }
}

// ═══════════════════════════════════════════════════════════════════════════
// PATCH — edit update OR pin/unpin
// ═══════════════════════════════════════════════════════════════════════════

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const ctx = await loadPostContext(supabase, id, user.id)
    if ('error' in ctx) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }
    const { post, project, isAuthor, isProjectOwner } = ctx

    // ─── ACTION MODE: pin / unpin (owner only) ────────────────────
    if (typeof body.action === 'string' && (body.action === 'pin' || body.action === 'unpin')) {
      if (!isProjectOwner) {
        return NextResponse.json({ error: 'Only the project owner can pin updates' }, { status: 403 })
      }

      const willPin = body.action === 'pin'

      // If pinning, enforce the max
      if (willPin) {
        if (post.is_pinned) {
          return NextResponse.json({ success: true, is_pinned: true, alreadyPinned: true })
        }
        const { count, error: countErr } = await supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .eq('is_pinned', true)

        if (countErr) throw countErr
        if ((count || 0) >= MAX_PINNED_PER_PROJECT) {
          return NextResponse.json({
            error: `You can pin at most ${MAX_PINNED_PER_PROJECT} updates. Unpin one first.`,
            code: 'pin_limit_reached',
            max: MAX_PINNED_PER_PROJECT,
            current: count,
          }, { status: 409 })
        }
      }

      const { data: updated, error: pinErr } = await supabase
        .from('posts')
        .update({
          is_pinned: willPin,
          pinned_at: willPin ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select('id, is_pinned, pinned_at')
        .single()

      if (pinErr) throw pinErr
      return NextResponse.json({ success: true, ...updated })
    }

    // ─── EDIT MODE ─────────────────────────────────────────────────
    if (!isAuthor && !isProjectOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const patch: Record<string, any> = { edited_at: new Date().toISOString() }

    // Title
    if (typeof body.title === 'string' || body.title === null) {
      patch.title = body.title ? safeString(body.title, MAX_TITLE_LEN).trim() : null
    }

    // Update type
    if (typeof body.update_type === 'string' && VALID_TYPES.has(body.update_type)) {
      patch.update_type = body.update_type
    }

    // Release label
    if (typeof body.release_label === 'string' && VALID_RELEASE_LABELS.has(body.release_label)) {
      patch.release_label = body.release_label
    }

    // Sections
    if (body.sections !== undefined) {
      const { sections, error: sErr } = sanitizeSections(body.sections)
      if (sErr) return NextResponse.json({ error: sErr }, { status: 400 })
      patch.sections = sections
    }

    // Links
    if (body.links !== undefined) {
      const { links, error: lErr } = sanitizeLinks(body.links)
      if (lErr) return NextResponse.json({ error: lErr }, { status: 400 })
      patch.links = links
    }

    // Tags
    if (body.tags !== undefined) {
      patch.tags = sanitizeTags(body.tags)
    }

    // Attachments
    if (body.attachments !== undefined) {
      patch.attachments = sanitizeAttachments(body.attachments)
    }

    // Comments disabled (owner only can toggle this)
    if (typeof body.comments_disabled === 'boolean') {
      if (isProjectOwner) {
        patch.comments_disabled = body.comments_disabled
      }
    }

    // Legacy content
    if (typeof body.content === 'string' || body.content === null) {
      patch.content = body.content ? safeString(body.content, MAX_CONTENT_LEN).trim() : null
    }

    // Legacy image_urls / media_urls / resource_url (accept but sanitize)
    if (Array.isArray(body.image_urls)) {
      patch.image_urls = body.image_urls.filter(isValidMediaUrl).slice(0, 8)
    }
    if (Array.isArray(body.media_urls)) {
      patch.media_urls = body.media_urls.filter(isValidMediaUrl).slice(0, 4)
    }
    if ('resource_url' in body) {
      if (body.resource_url === null || body.resource_url === '') {
        patch.resource_url = null
        patch.resource_label = null
      } else if (isValidUrl(body.resource_url)) {
        patch.resource_url = String(body.resource_url).slice(0, 500)
        if (typeof body.resource_label === 'string') {
          patch.resource_label = body.resource_label.slice(0, 100)
        }
      }
    }

    if (Object.keys(patch).length <= 1) {
      // only edited_at — nothing to update
      return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
    }

    const { data: updated, error: updErr } = await supabase
      .from('posts')
      .update(patch)
      .eq('id', id)
      .select(`
        *,
        user:users!posts_user_id_fkey (
          id, full_name, username, avatar_url, is_verified
        )
      `)
      .single()

    if (updErr) {
      console.error('[update:PATCH] Update error:', updErr)
      if ((updErr as any).code === '42703') {
        return NextResponse.json(
          { error: 'Database schema is out of date. Please run pending migrations.' },
          { status: 500 }
        )
      }
      throw updErr
    }

    // Normalize section image entries for legacy rows
    if (updated?.sections && Array.isArray(updated.sections)) {
      for (const s of updated.sections) {
        if (Array.isArray(s.images)) {
          s.images = s.images.map((img: any) =>
            typeof img === 'string' ? { url: img } : img
          ).filter((img: any) => img && img.url)
        }
      }
    }

    return NextResponse.json({ success: true, update: updated })
  } catch (error: any) {
    console.error('[update:PATCH] Fatal:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUT — legacy alias for PATCH (kept for backwards compat)
// ═══════════════════════════════════════════════════════════════════════════

export async function PUT(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  return PATCH(request, context)
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE — hard delete update (author or project owner)
// ═══════════════════════════════════════════════════════════════════════════

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const ctx = await loadPostContext(supabase, id, user.id)
    if ('error' in ctx) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }
    const { isAuthor, isProjectOwner, project } = ctx

    if (!isAuthor && !isProjectOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error: delErr } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (delErr) throw delErr

    // Non-blocking: refresh project activity timestamp
    Promise.resolve(
      supabase.from('projects')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', project.id)
    ).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[update:DELETE] Fatal:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete update' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET — single update detail (used by share link, edit modal, etc.)
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const { data: post, error: postErr } = await supabase
      .from('posts')
      .select(`
        *,
        user:users!posts_user_id_fkey (
          id, full_name, username, avatar_url, is_verified
        )
      `)
      .eq('id', id)
      .maybeSingle()

    if (postErr) throw postErr
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Visibility gate via project
    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id, is_public, visibility, status, slug')
      .eq('id', post.project_id)
      .maybeSingle()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isPublicReadable =
      project.status !== 'draft' &&
      project.status !== 'archived' &&
      (project.is_public || project.visibility === 'public' || project.visibility === 'unlisted')

    let canRead = isPublicReadable
    if (!canRead && user?.id) {
      if (project.founder_id === user.id || project.user_id === user.id) {
        canRead = true
      } else {
        const { data: member } = await supabase
          .from('project_members')
          .select('id')
          .eq('project_id', project.id)
          .eq('user_id', user.id)
          .maybeSingle()
        if (member) canRead = true
      }
    }

    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Normalize legacy nulls + image entries
    if (!Array.isArray(post.sections)) post.sections = []
    if (!Array.isArray(post.links)) post.links = []
    if (!Array.isArray(post.tags)) post.tags = []
    if (!Array.isArray(post.image_urls)) post.image_urls = []
    if (!Array.isArray(post.media_urls)) post.media_urls = []
    if (!Array.isArray(post.attachments)) post.attachments = []
    if (!post.release_label) post.release_label = 'none'

    for (const s of post.sections) {
      if (Array.isArray(s.images)) {
        s.images = s.images.map((img: any) =>
          typeof img === 'string' ? { url: img } : img
        ).filter((img: any) => img && img.url)
      }
    }

    // User state
    if (user?.id) {
      const [{ data: liked }, { data: bkm }] = await Promise.all([
        Promise.resolve(supabase.from('post_likes').select('id').eq('post_id', id).eq('user_id', user.id).maybeSingle()),
        Promise.resolve(supabase.from('post_bookmarks').select('id').eq('post_id', id).eq('user_id', user.id).maybeSingle()),
      ])
      post.user_liked = !!liked
      post.user_bookmarked = !!bkm
    }

    // Author role hint
    if (project.founder_id === post.user_id || project.user_id === post.user_id) {
      post.author_role = 'Founder'
    } else {
      const { data: member } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', project.id)
        .eq('user_id', post.user_id)
        .maybeSingle()
      if (member?.role) post.author_role = member.role
    }

    return NextResponse.json({ update: post, project_slug: project.slug })
  } catch (error: any) {
    console.error('[update:GET] Fatal:', error)
    return NextResponse.json({ error: error?.message || 'Failed to load' }, { status: 500 })
  }
}