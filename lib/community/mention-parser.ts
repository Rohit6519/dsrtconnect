// ============================================================
// lib/community/mention-parser.ts
// Extract @username mentions from post/comment bodies.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'

const MENTION_RE = /@([a-z0-9_.-]{2,32})/gi

export function extractMentionCandidates(text: string): string[] {
  if (!text) return []
  const matches = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = MENTION_RE.exec(text)) !== null) {
    matches.add(m[1].toLowerCase())
  }
  return Array.from(matches)
}

export async function resolveMentions(
  supabase: SupabaseClient,
  usernames: string[]
): Promise<Array<{ id: string; username: string; full_name: string }>> {
  if (usernames.length === 0) return []
  const { data } = await supabase
    .from('users')
    .select('id, username, full_name')
    .in('username', usernames)
    .limit(usernames.length)
  return (data || []) as any[]
}

export function extractHashtags(text: string): string[] {
  if (!text) return []
  const re = /#([a-z0-9_-]{2,30})/gi
  const tags = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    tags.add(m[1].toLowerCase())
  }
  return Array.from(tags)
}