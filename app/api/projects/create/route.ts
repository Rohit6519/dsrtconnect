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

    const name = (body.name || 'Untitled Project').trim().slice(0, 120)
    const slug = generateSlug(name)

    const insertData: Record<string, any> = {
      name,
      slug,
      founder_id: user.id,
      user_id: user.id,
      status: 'draft',
      visibility: 'draft',
      is_public: false,
      stage: body.stage || 'idea',
      project_type: body.project_type || 'personal',
      icon: body.icon || '\u26A1',
      color: body.color || 'purple',
      show_in_explore: body.show_in_explore !== false,
      allow_recommendations: true,
      allow_builder_matching: true,
      messaging_permission: 'anyone',
      application_permission: 'anyone',
    }

    if (body.short_description) insertData.short_description = String(body.short_description).slice(0, 200)
    if (body.tagline) insertData.tagline = String(body.tagline).slice(0, 200)
    if (body.industry) insertData.industry = String(body.industry).slice(0, 80)
    if (Array.isArray(body.category)) insertData.category = body.category.slice(0, 8)
    if (Array.isArray(body.tech_stack)) insertData.tech_stack = body.tech_stack.slice(0, 12)

    const { data, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    // Add creator as project member (owner role)
    await supabase.from('project_members').insert({
      project_id: data.id,
      user_id: user.id,
      role: 'owner',
    }).then(() => {}, () => {})

    // Track signal
    await supabase.from('user_activity_signals').insert({
      user_id: user.id,
      signal_type: 'create',
      entity_type: 'project',
      entity_id: data.id,
      weight: 5.0,
    }).then(() => {}, () => {})

    return NextResponse.json({ success: true, project: data })
  } catch (error: any) {
    console.error('Create project error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to create' }, { status: 500 })
  }
}
