import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: community } = await supabase
    .from('communities')
    .select('id, created_by, name, member_count, post_count, view_count, is_verified')
    .eq('id', params.id)
    .single()

  if (!community) {
    return NextResponse.json({ error: 'Community not found' }, { status: 404 })
  }

  if (community.created_by !== user.id) {
    return NextResponse.json({ 
      error: 'Only creator can request verification' 
    }, { status: 403 })
  }

  if (community.is_verified) {
    return NextResponse.json({ 
      error: 'Community is already verified' 
    }, { status: 400 })
  }

  // Check all 3 criteria
  const memberOk = community.member_count >= 100
  const postOk = community.post_count >= 20
  const viewOk = community.view_count >= 500
  const allMet = memberOk && postOk && viewOk

  if (!allMet) {
    // 🎯 Show what's missing
    const missing = []
    if (!memberOk) missing.push(`${100 - community.member_count} more members`)
    if (!postOk) missing.push(`${20 - community.post_count} more posts`)
    if (!viewOk) missing.push(`${500 - community.view_count} more views`)

    return NextResponse.json({
      success: false,
      verified: false,
      message: 'You need ALL 3 criteria to be verified',
      missing,
      progress: {
        members: {
          current: community.member_count,
          required: 100,
          met: memberOk,
          percentage: Math.min(100, Math.round((community.member_count / 100) * 100)),
        },
        posts: {
          current: community.post_count,
          required: 20,
          met: postOk,
          percentage: Math.min(100, Math.round((community.post_count / 20) * 100)),
        },
        views: {
          current: community.view_count,
          required: 500,
          met: viewOk,
          percentage: Math.min(100, Math.round((community.view_count / 500) * 100)),
        },
      },
      tip: 'ALL 3 criteria must be met for verification'
    })
  }

  // All criteria met - verify
  const { error } = await supabase.rpc(
    'check_community_verification', 
    { p_community_id: params.id }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: updated } = await supabase
    .from('communities')
    .select('is_verified, verified_at, verification_reason')
    .eq('id', params.id)
    .single()

  return NextResponse.json({ 
    success: true, 
    verified: true,
    message: 'Congratulations! All 3 criteria met. Your community is verified! ✓',
    community: updated,
  })
}