import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface Recipient {
  identity_id?: string | null
  entity_type: 'user' | 'project' | 'venture' | 'opportunity'
  entity_id?: string
  dsrt_email: string
  display_name: string
  avatar_url?: string
  subtitle?: string
  verified?: boolean
}

function generateSlug(name: string, fallback?: string): string {
  const cleaned = (name || fallback || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned || 'unknown'
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ results: [] })

  const { searchParams } = new URL(request.url)
  const rawQ = (searchParams.get('q') || '').trim()
  if (rawQ.length < 1) return NextResponse.json({ results: [] })

  // Clean term (extract 'rohit' from 'rohit@dsrt.com' or '@rohit')
  const cleanTerm = rawQ.replace(/@dsrt\.com$/i, '').replace(/^@/, '').trim().toLowerCase()
  const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 25)

  try {
    const results: Recipient[] = []
    const seenKeys = new Set<string>()
    const seenEmails = new Set<string>()

    // 1. SEARCH EXISTING PROVISIONED MAIL IDENTITIES
    const { data: identityMatches } = await supabase
      .from('mail_identities')
      .select('id, entity_type, entity_id, dsrt_email, display_name, avatar_url')
      .or(`dsrt_email.ilike.%${cleanTerm}%,display_name.ilike.%${cleanTerm}%`)
      .neq('entity_id', user.id)
      .limit(20)

    ;(identityMatches || []).forEach(r => {
      const key = `${r.entity_type}:${r.entity_id}`
      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        seenEmails.add(r.dsrt_email.toLowerCase())
        results.push({
          identity_id: r.id,
          entity_type: r.entity_type as any,
          entity_id: r.entity_id,
          dsrt_email: r.dsrt_email,
          display_name: r.display_name,
          avatar_url: r.avatar_url,
        })
      }
    })

    // 2. SEARCH USERS TABLE (Auto-provision fallback)
    const { data: userMatches } = await supabase
      .from('users')
      .select('id, username, full_name, avatar_url, dsrt_email, tagline, is_verified')
      .or(`username.ilike.%${cleanTerm}%,full_name.ilike.%${cleanTerm}%,dsrt_email.ilike.%${cleanTerm}%`)
      .neq('id', user.id)
      .limit(10)

    ;(userMatches || []).forEach(u => {
      const key = `user:${u.id}`
      const email = u.dsrt_email || `${(u.username || '').toLowerCase()}@dsrt.com`
      if (!seenKeys.has(key) && !seenEmails.has(email.toLowerCase())) {
        seenKeys.add(key)
        seenEmails.add(email.toLowerCase())
        results.push({
          identity_id: null,
          entity_type: 'user',
          entity_id: u.id,
          dsrt_email: email,
          display_name: u.full_name || u.username || 'User',
          avatar_url: u.avatar_url,
          subtitle: u.tagline || `@${u.username}`,
          verified: u.is_verified,
        })
      }
    })

    // 3. SEARCH VENTURES TABLE
    const { data: ventureMatches } = await supabase
      .from('ventures')
      .select('id, name, slug, venture_number, logo_url, dsrt_email, tagline')
      .or(`name.ilike.%${cleanTerm}%,slug.ilike.%${cleanTerm}%,tagline.ilike.%${cleanTerm}%`)
      .limit(10)

    ;(ventureMatches || []).forEach(v => {
      const key = `venture:${v.id}`
      const slug = v.slug || v.venture_number || generateSlug(v.name)
      const email = v.dsrt_email || `${generateSlug(slug)}@dsrt.com`
      if (!seenKeys.has(key) && !seenEmails.has(email.toLowerCase())) {
        seenKeys.add(key)
        seenEmails.add(email.toLowerCase())
        results.push({
          identity_id: null,
          entity_type: 'venture',
          entity_id: v.id,
          dsrt_email: email,
          display_name: v.name,
          avatar_url: v.logo_url,
          subtitle: v.tagline || 'Venture',
        })
      }
    })

    // 4. SEARCH PROJECTS TABLE
    const { data: projectMatches } = await supabase
      .from('projects')
      .select('id, name, slug, project_number, logo_url, dsrt_email, tagline')
      .or(`name.ilike.%${cleanTerm}%,slug.ilike.%${cleanTerm}%,tagline.ilike.%${cleanTerm}%`)
      .limit(10)

    ;(projectMatches || []).forEach(p => {
      const key = `project:${p.id}`
      const slug = p.slug || p.project_number || generateSlug(p.name)
      const email = p.dsrt_email || `${generateSlug(slug)}@dsrt.com`
      if (!seenKeys.has(key) && !seenEmails.has(email.toLowerCase())) {
        seenKeys.add(key)
        seenEmails.add(email.toLowerCase())
        results.push({
          identity_id: null,
          entity_type: 'project',
          entity_id: p.id,
          dsrt_email: email,
          display_name: p.name,
          avatar_url: p.logo_url,
          subtitle: p.tagline || 'Project',
        })
      }
    })

    // Sort relevance
    const sorted = results.sort((a, b) => {
      if (a.identity_id && !b.identity_id) return -1
      if (!a.identity_id && b.identity_id) return 1
      const aStarts = a.display_name.toLowerCase().startsWith(cleanTerm) || a.dsrt_email.toLowerCase().startsWith(cleanTerm)
      const bStarts = b.display_name.toLowerCase().startsWith(cleanTerm) || b.dsrt_email.toLowerCase().startsWith(cleanTerm)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return 0
    }).slice(0, limit)

    return NextResponse.json({ results: sorted })
  } catch (e: any) {
    console.error('Recipient search error:', e)
    return NextResponse.json({ error: e?.message, results: [] }, { status: 500 })
  }
}