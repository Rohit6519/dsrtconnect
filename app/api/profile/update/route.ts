import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { TrustEngine } from '@/lib/trust/TrustEngine'

const ALLOWED_FIELDS = [
  'full_name', 'tagline', 'bio', 'location', 'banner_url', 'avatar_url', 
  'website', 'github_url', 'linkedin_url', 'twitter_url', 'languages', 
  'availability', 'availability_hours', 'open_to_collaboration',
  'collaboration_types', 'looking_for_opportunities', 'interest_topics',
  'brings', 'seeking', 'social_links', 'custom_links', 'is_open_to_work', 
  'is_hiring', 'contact_email', 'contact_phone', 'show_contact'
]

export async function PATCH(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    
    let isMajorUpdate = false

    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        updates[key] = body[key]
        if (['avatar_url', 'bio', 'brings', 'seeking'].includes(key) && body[key]) {
          isMajorUpdate = true
        }
      }
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ success: true, message: 'No changes provided' })
    }

    const { data, error } = await adminClient
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select('account_status, trust_level, trust_score')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If they added an avatar or bio, recalculate their trust score
    if (isMajorUpdate) {
      if (updates.avatar_url) await TrustEngine.recordEvent(user.id, 'AVATAR_UPLOADED')
      await TrustEngine.recomputeScore(user.id)
    }

    return NextResponse.json({ user: data })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}