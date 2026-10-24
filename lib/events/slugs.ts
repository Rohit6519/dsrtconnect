import { SupabaseClient } from '@supabase/supabase-js'
import { ValidationError } from '@/lib/kernel'

export function normalizeEventSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export async function ensureEventSlugAvailable(
  supabase: SupabaseClient,
  communityId: string,
  slug: string,
  excludeEventId?: string
) {
  const normalized = normalizeEventSlug(slug)
  if (normalized.length < 3) {
    throw new ValidationError([{ field: 'slug', message: 'Slug must be at least 3 characters' }])
  }
  const { data: existing } = await supabase
    .from('event_events')
    .select('id')
    .eq('community_id', communityId)
    .eq('slug', normalized)
    .maybeSingle()
  if (existing && existing.id !== excludeEventId) {
    throw new ValidationError([{ field: 'slug', message: 'This event slug is already used in this community' }])
  }
  return normalized
}