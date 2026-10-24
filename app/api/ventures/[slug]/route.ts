import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: venture, error } = await supabase
    .from('ventures')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [team, products, lookingFor, updates, metrics, timeline, partners, activity, funding] = await Promise.all([
    supabase.from('venture_team_members').select('*, users(id, full_name, username, avatar_url, tagline)').eq('venture_id', venture.id).order('position'),
    supabase.from('venture_products').select('*').eq('venture_id', venture.id).order('position'),
    supabase.from('venture_looking_for').select('*').eq('venture_id', venture.id).eq('status', 'open').order('position'),
    supabase.from('venture_updates').select('*, author:users!user_id(id, full_name, username, avatar_url)').eq('venture_id', venture.id).eq('is_public', true).order('created_at', { ascending: false }).limit(10),
    supabase.from('venture_metrics').select('*, venture_metric_entries(value, date, note)').eq('venture_id', venture.id).eq('is_public', true).order('position'),
    supabase.from('venture_timeline').select('*').eq('venture_id', venture.id).eq('is_public', true).order('event_date', { ascending: false }),
    supabase.from('venture_partners').select('*').eq('venture_id', venture.id).order('position'),
    supabase.from('venture_activity').select('*').eq('venture_id', venture.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('venture_funding_rounds').select('*').eq('venture_id', venture.id).eq('is_public', true).order('date', { ascending: false })
  ])

  const founder = venture.user_id ? await supabase.from('users').select('id, full_name, username, avatar_url, tagline, is_verified').eq('id', venture.user_id).single() : null

  const isFollowing = user ? await supabase.from('venture_followers').select('venture_id').eq('venture_id', venture.id).eq('user_id', user.id).maybeSingle() : null

  const isOwner = user && (venture.user_id === user.id || venture.founder_id === user.id)

  if (user) {
    supabase.rpc('record_venture_view_v2', { p_venture_id: venture.id, p_viewer_id: user.id, p_source: 'direct' }).then(() => {}, () => {})
  }

  return NextResponse.json({
    venture,
    team: team.data || [],
    products: products.data || [],
    lookingFor: lookingFor.data || [],
    updates: updates.data || [],
    metrics: metrics.data || [],
    timeline: timeline.data || [],
    partners: partners.data || [],
    activity: activity.data || [],
    funding: funding.data || [],
    founder: founder?.data || null,
    isFollowing: !!isFollowing?.data,
    isOwner: !!isOwner
  })
}

export async function PATCH(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const { data, error } = await supabase
    .from('ventures')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .or(`user_id.eq.${user.id},founder_id.eq.${user.id}`)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ venture: data })
}