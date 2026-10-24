import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UpdateReader } from '@/components/project-detail/UpdateReader'
import { CocoPageInjector } from '@/components/coco/CocoPageInjector'

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE CONFIG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Always render fresh (never cache the SSR response).
 * Comments, likes, and pin state can change any second — the reader must
 * reflect current data on every visit.
 */
export const dynamic = 'force-dynamic'

/**
 * Node runtime required — server client uses Node-only cookie APIs.
 */
export const runtime = 'nodejs'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PageProps {
  params: Promise<{ slug: string; id: string }>
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUuid(id: string): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id)
}

/**
 * Extract a plain-text excerpt from an update's sections or legacy content.
 * Used for meta description + og:description tags.
 */
function buildExcerpt(update: any, maxLen = 200): string {
  if (!update) return ''

  // Prefer first section text
  let raw = ''
  if (Array.isArray(update.sections) && update.sections.length > 0) {
    raw = String(update.sections[0]?.text || '')
  }
  if (!raw && update.content) {
    raw = String(update.content)
  }
  if (!raw) return ''

  // Strip markdown cleanly
  const cleaned = raw
    .replace(/```[\s\S]*?```/g, '')       // code blocks
    .replace(/`[^`]+`/g, '')               // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '')       // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → keep text
    .replace(/[#*_~>]/g, '')               // markdown syntax
    .replace(/\n{2,}/g, ' ')               // collapse blank lines
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.length <= maxLen) return cleaned
  return cleaned.slice(0, maxLen - 1).trimEnd() + '…'
}

/**
 * Find the first image or cover to use as og:image.
 * Falls back to project cover, then project logo.
 */
function findOgImage(update: any, project: any): string | null {
  // Check first section for images
  if (Array.isArray(update?.sections)) {
    for (const s of update.sections) {
      if (Array.isArray(s?.images) && s.images.length > 0) {
        const first = s.images[0]
        if (typeof first === 'string') return first
        if (first?.url) return first.url
      }
    }
  }
  // Legacy image_urls
  if (Array.isArray(update?.image_urls) && update.image_urls.length > 0) {
    return update.image_urls[0]
  }
  // Project cover
  if (project?.cover_image_url) return project.cover_image_url
  // Project logo
  if (project?.logo_url) return project.logo_url
  return null
}

// ═══════════════════════════════════════════════════════════════════════════
// METADATA — server-generated for SEO + social share previews
// ═══════════════════════════════════════════════════════════════════════════

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, id } = await params

  // Fail fast on bad IDs — return generic metadata so no DB round-trip happens
  if (!slug || !id || !isValidUuid(id)) {
    return {
      title: 'Update · DSRT',
      description: 'View project updates on DSRT.',
      robots: { index: false, follow: false },
    }
  }

  try {
    const supabase = await createClient()

    // Fetch just the fields we need for metadata — small query
    const { data: post } = await supabase
      .from('posts')
      .select(`
        id, title, content, sections, image_urls, created_at, release_label,
        project:projects!posts_project_id_fkey(
          id, slug, name, cover_image_url, logo_url, is_public, visibility, status
        )
      `)
      .eq('id', id)
      .maybeSingle()

    if (!post || !post.project) {
      return {
        title: 'Update not found · DSRT',
        description: 'This update could not be found.',
        robots: { index: false, follow: false },
      }
    }

    const project = Array.isArray(post.project) ? post.project[0] : post.project

    // Only index publicly readable projects
    const isPublic =
      project.status !== 'draft' &&
      project.status !== 'archived' &&
      (project.is_public || project.visibility === 'public')

    // Slug mismatch guard — refuse to expose metadata via wrong slug
    if (project.slug !== slug) {
      return {
        title: 'Update not found · DSRT',
        robots: { index: false, follow: false },
      }
    }

    const title = post.title || `Update from ${project.name}`
    const excerpt = buildExcerpt(post, 180) || `Latest update from ${project.name} on DSRT.`
    const ogImage = findOgImage(post, project)
    const canonicalUrl = `/projects/${project.slug}/updates/${post.id}`

    const releasePrefix =
      post.release_label === 'release' ? '🚀 Release · ' :
      post.release_label === 'pre-release' ? '🧪 Pre-release · ' :
      ''

    return {
      title: `${releasePrefix}${title} · ${project.name}`,
      description: excerpt,
      alternates: {
        canonical: canonicalUrl,
      },
      robots: isPublic
        ? { index: true, follow: true }
        : { index: false, follow: false },
      openGraph: {
        title,
        description: excerpt,
        url: canonicalUrl,
        siteName: 'DSRT',
        type: 'article',
        publishedTime: post.created_at,
        ...(ogImage ? { images: [{ url: ogImage, alt: title }] } : {}),
      },
      twitter: {
        card: ogImage ? 'summary_large_image' : 'summary',
        title,
        description: excerpt,
        ...(ogImage ? { images: [ogImage] } : {}),
      },
    }
  } catch {
    // Never throw from metadata generation — return safe defaults
    return {
      title: 'Update · DSRT',
      description: 'View project updates on DSRT.',
      robots: { index: false, follow: false },
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default async function ProjectUpdateReaderPage({ params }: PageProps) {
  const { slug, id } = await params

  // ─── 1. Guard against malformed URLs ──────────────────────────────────
  if (!slug) {
    redirect('/projects')
  }
  if (!id || !isValidUuid(id)) {
    // Bad update ID → send them to the project's updates tab
    redirect(`/projects/${slug}?tab=updates`)
  }

  // ─── 2. Resolve current user server-side ──────────────────────────────
  // The client component fetches user via createClient() too, but resolving
  // here means the first paint already knows whether to render owner controls
  // and reduces one round-trip on the client.
  let currentUserId: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    currentUserId = user?.id || null
  } catch (e) {
    // If auth fails for any reason, treat as anonymous — public updates still work
    console.error('[updates/[id]/page] Auth resolve failed:', e)
    currentUserId = null
  }

  // ─── 3. Render ────────────────────────────────────────────────────────
  return (
    <>
      {/*
        Coco AI context injector — lets the assistant know what page the user
        is on so it can answer contextual questions about this specific update.
      */}
      <CocoPageInjector
        page="project_update"
        entity={{ type: 'project_update', id }}
        component={{ registry_id: 'project.update.reader' }}
      />

      <UpdateReader
        slug={slug}
        updateId={id}
        currentUserId={currentUserId}
      />
    </>
  )
}