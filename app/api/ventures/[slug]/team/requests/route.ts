import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List join requests for a venture (Owner/Member only)
export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    const { data: isMember } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: requests, error } = await supabase
      .from('venture_join_requests')
      .select('*, applicant:users!applicant_id(id, full_name, username, avatar_url, tagline)')
      .eq('venture_id', venture.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ requests: requests || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: Create a Join Request (Applicant)
export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: venture } = await supabase.from('ventures').select('id, name').eq('slug', slug).single()
    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    const body = await req.json()
    const { requested_role_title, motivation, relevant_experience, portfolio_url } = body

    if (!requested_role_title?.trim() || !motivation?.trim()) {
      return NextResponse.json({ error: 'Role title and motivation are required' }, { status: 400 })
    }

    const { data: request, error } = await supabase
      .from('venture_join_requests')
      .insert({
        venture_id: venture.id,
        applicant_id: user.id,
        requested_role_title: requested_role_title.trim(),
        motivation: motivation.trim(),
        relevant_experience: relevant_experience?.trim() || null,
        portfolio_url: portfolio_url?.trim() || null,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, request })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH: Review Join Request (Approve / Reject / Request Info)
export async function PATCH(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    const { data: isMember } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { request_id, action, response_message, assigned_role_id, permissions = [] } = body

    if (!['approve', 'reject', 'request_info'].includes(action)) {
      return NextResponse.json({ error: 'Invalid decision action' }, { status: 400 })
    }

    const { data: joinReq } = await supabase
      .from('venture_join_requests')
      .select('*')
      .eq('id', request_id)
      .eq('venture_id', venture.id)
      .single()

    if (!joinReq) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    let newStatus = joinReq.status
    if (action === 'approve') newStatus = 'approved'
    if (action === 'reject') newStatus = 'rejected'
    if (action === 'request_info') newStatus = 'waiting_info'

    // Update Request
    const { data: updatedReq, error: reqErr } = await supabase
      .from('venture_join_requests')
      .update({
        status: newStatus,
        response_message: response_message?.trim() || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', request_id)
      .select()
      .single()

    if (reqErr) throw reqErr

    // If Approved: Create Active Membership Transactionally
    if (action === 'approve') {
      const { data: pos } = await supabase
        .from('venture_team_positions')
        .select('id')
        .eq('venture_id', venture.id)
        .limit(1)
        .maybeSingle()

      if (pos) {
        // FIXED: Replaced .onConflictDoNothing() with standard .upsert
        await supabase
          .from('venture_team_memberships')
          .upsert(
            {
              venture_id: venture.id,
              user_id: joinReq.applicant_id,
              position_id: pos.id,
              role_id: assigned_role_id || null,
              role_title: joinReq.requested_role_title,
              permissions,
              source: 'join_request',
              status: 'active'
            },
            { onConflict: 'venture_id,user_id', ignoreDuplicates: true }
          )
      }
    }

    return NextResponse.json({ success: true, request: updatedReq })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}