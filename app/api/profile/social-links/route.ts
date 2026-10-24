import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Normalize a URL: add https:// if missing, trim
function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Email URLs use mailto:
  if (trimmed.includes('@') && !trimmed.startsWith('http') && !trimmed.startsWith('mailto:')) {
    return trimmed // return raw email — we store it as-is in contact_email
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * PATCH /api/profile/social-links
 * Body: {
 *   linkedin_url?, twitter_url?, instagram_url?, facebook_url?,
 *   website?, contact_email?
 * }
 * Any field passed as empty string → set to null (clear).
 * Omitted fields are not touched.
 */
export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const patch: Record<string, string | null> = {}

  // URL fields
  const urlFields = ['linkedin_url', 'twitter_url', 'instagram_url', 'facebook_url', 'website'] as const
  for (const field of urlFields) {
    if (field in body) {
      patch[field] = normalizeUrl(body[field])
    }
  }

  // Email
  if ('contact_email' in body) {
    const email = (body.contact_email || '').toString().trim()
    if (!email) {
      patch.contact_email = null
    } else if (validateEmail(email)) {
      patch.contact_email = email
    } else {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', user.id)
    .select('linkedin_url, twitter_url, instagram_url, facebook_url, website, contact_email')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, links: data })
}