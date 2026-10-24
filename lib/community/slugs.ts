// ============================================================
// lib/community/slugs.ts
// Slug generation, validation, uniqueness.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'

const RESERVED_SLUGS = new Set([
  'admin', 'api', 'auth', 'login', 'signup', 'settings', 'help', 'about',
  'privacy', 'terms', 'contact', 'support', 'blog', 'docs', 'discover',
  'community', 'communities', 'network', 'me', 'you', 'new', 'create',
  'edit', 'delete', 'search', 'explore', 'trending', 'popular', 'featured',
  'home', 'feed', 'notifications', 'profile', 'projects', 'ventures',
  'looking-for', 'inbox', 'coco', 'dsrt', 'connect', 'organization', 'organizations',
])

export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function isValidSlug(slug: string): { valid: boolean; reason?: string } {
  if (!slug) return { valid: false, reason: 'Slug is required' }
  if (slug.length < 3) return { valid: false, reason: 'Slug must be at least 3 characters' }
  if (slug.length > 60) return { valid: false, reason: 'Slug must be at most 60 characters' }
  if (!/^[a-z0-9-]+$/.test(slug)) return { valid: false, reason: 'Slug can only contain lowercase letters, numbers, and hyphens' }
  if (slug.startsWith('-') || slug.endsWith('-')) return { valid: false, reason: 'Slug cannot start or end with hyphen' }
  if (RESERVED_SLUGS.has(slug)) return { valid: false, reason: 'This slug is reserved' }
  return { valid: true }
}

export async function isSlugAvailable(
  supabase: SupabaseClient,
  slug: string,
  excludeCommunityId?: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('communities')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing && existing.id !== excludeCommunityId) return false

  const { data: historical } = await supabase
    .from('community_slug_history')
    .select('community_id')
    .eq('old_slug', slug)
    .maybeSingle()

  if (historical && historical.community_id !== excludeCommunityId) return false

  return true
}

export async function generateUniqueSlug(
  supabase: SupabaseClient,
  name: string
): Promise<string> {
  const base = normalizeSlug(name) || 'community'
  let candidate = base
  let suffix = 1

  while (!(await isSlugAvailable(supabase, candidate))) {
    suffix++
    candidate = `${base}-${suffix}`
    if (suffix > 100) {
      candidate = `${base}-${Date.now().toString(36)}`
      break
    }
  }

  return candidate
}