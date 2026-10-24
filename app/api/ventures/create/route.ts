import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function generateSlug(name: string): string {
  const base = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const suffix = Math.random().toString(36).substring(2, 8)
  return base + '-' + suffix
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))

    const name = (body.name || 'Untitled Venture').trim().slice(0, 120)
    if (name.length < 2) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    const slug = generateSlug(name)

    const insertData: Record<string, any> = {
      name,
      slug,
      user_id: user.id,
      founder_id: user.id,
      status: 'active',
      stage: body.stage || 'idea',
      is_current: true,
      is_building_public: body.is_building_public !== false,
      show_in_explore: body.show_in_explore !== false,
      published_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    }

    if (body.tagline) insertData.tagline = String(body.tagline).slice(0, 200)
    if (body.description) insertData.description = String(body.description).slice(0, 2000)
    if (body.industry) insertData.industry = String(body.industry).slice(0, 100)
    if (body.sector) insertData.sector = String(body.sector).slice(0, 100)
    if (body.location) insertData.location = String(body.location).slice(0, 200)
    if (body.headquarters) insertData.headquarters = String(body.headquarters).slice(0, 200)
    if (body.website) insertData.website = String(body.website).slice(0, 500)
    if (body.funding_stage) insertData.funding_stage = body.funding_stage
    if (body.business_model) insertData.business_model = body.business_model
    if (body.problem) insertData.problem = String(body.problem).slice(0, 1000)
    if (body.solution) insertData.solution = String(body.solution).slice(0, 1000)
    if (body.mission) insertData.mission = String(body.mission).slice(0, 500)
    if (body.vision) insertData.vision = String(body.vision).slice(0, 500)
    if (body.target_market) insertData.target_market = String(body.target_market).slice(0, 500)
    if (Array.isArray(body.tags)) insertData.tags = body.tags.slice(0, 8).map((t: any) => String(t).slice(0, 40))
    if (Array.isArray(body.achievements)) insertData.achievements = body.achievements.slice(0, 10)

    const { data, error } = await supabase
      .from('ventures')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    // Add creator as founder team member
    await supabase.from('venture_team_members').insert({
      venture_id: data.id,
      user_id: user.id,
      name: user.email || 'Founder',
      role: 'Founder',
      is_founder: true,
      status: 'active',
    }).then(() => {}, () => {})

    // Track signal
    await supabase.from('user_activity_signals').insert({
      user_id: user.id,
      signal_type: 'create',
      entity_type: 'venture',
      entity_id: data.id,
      weight: 5.0,
    }).then(() => {}, () => {})

    return NextResponse.json({ success: true, venture: data })
  } catch (e: any) {
    console.error('Create venture error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to create' }, { status: 500 })
  }
}
