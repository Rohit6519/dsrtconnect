import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_SKILLS = 50
const MAX_DESCRIPTION = 240

/**
 * GET /api/profile/skills?user_id=<id>
 * Returns skills with description + certificate + endorsement count
 */
export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const { data: userSkills, error } = await supabase
    .from('user_skills')
    .select(`
      id, level, endorsements_count, is_top_skill, years_of_experience,
      description, certificate_url, certificate_filename,
      skills:skill_id ( id, name, category )
    `)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ skills: userSkills || [] })
}

/**
 * POST /api/profile/skills
 * Body: { name, category?, level?, description?, certificate_url?, certificate_filename? }
 */
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const trimmed = (body.name || '').trim()

  if (!trimmed) return NextResponse.json({ error: 'Skill name required' }, { status: 400 })
  if (trimmed.length > 100) return NextResponse.json({ error: 'Skill name too long' }, { status: 400 })

  const description = (body.description || '').trim().slice(0, MAX_DESCRIPTION) || null

  const { count: userSkillCount } = await supabase
    .from('user_skills')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((userSkillCount || 0) >= MAX_SKILLS) {
    return NextResponse.json({ error: `Max ${MAX_SKILLS} skills` }, { status: 400 })
  }

  // Find or create canonical skill
  let skillId: string | null = null
  const { data: existing } = await supabase
    .from('skills')
    .select('id, name, category')
    .ilike('name', trimmed)
    .limit(1)
    .maybeSingle()

  if (existing) {
    skillId = existing.id
  } else {
    const { data: newSkill, error: createErr } = await supabase
      .from('skills')
      .insert({
        name: trimmed,
        category: (body.category || 'Other').trim() || 'Other',
      })
      .select('id, name, category')
      .single()

    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
    skillId = newSkill.id
  }

  const { data: alreadyHas } = await supabase
    .from('user_skills')
    .select('id')
    .eq('user_id', user.id)
    .eq('skill_id', skillId)
    .maybeSingle()

  if (alreadyHas) return NextResponse.json({ error: 'Skill already added' }, { status: 400 })

  const validLevels = ['beginner','intermediate','advanced','expert']
  const finalLevel = body.level && validLevels.includes(body.level.toLowerCase())
    ? body.level.toLowerCase()
    : 'intermediate'

  const { data: userSkill, error: attachErr } = await supabase
    .from('user_skills')
    .insert({
      user_id: user.id,
      skill_id: skillId,
      level: finalLevel,
      description,
      certificate_url: body.certificate_url || null,
      certificate_filename: body.certificate_filename || null,
    })
    .select(`
      id, level, endorsements_count, is_top_skill, years_of_experience,
      description, certificate_url, certificate_filename,
      skills:skill_id ( id, name, category )
    `)
    .single()

  if (attachErr) return NextResponse.json({ error: attachErr.message }, { status: 500 })

  return NextResponse.json({ skill: userSkill })
}

/**
 * PATCH /api/profile/skills
 * Body: { id, level?, description?, certificate_url?, certificate_filename?, is_top_skill? }
 */
export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const id = body.id
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: existing } = await supabase
    .from('user_skills')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const patch: Record<string, any> = {}
  const validLevels = ['beginner','intermediate','advanced','expert']

  if ('level' in body) {
    const lvl = (body.level || '').toLowerCase()
    if (validLevels.includes(lvl)) patch.level = lvl
  }
  if ('description' in body) {
    patch.description = (body.description || '').trim().slice(0, MAX_DESCRIPTION) || null
  }
  if ('certificate_url' in body) patch.certificate_url = body.certificate_url || null
  if ('certificate_filename' in body) patch.certificate_filename = body.certificate_filename || null
  if ('is_top_skill' in body) patch.is_top_skill = !!body.is_top_skill

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('user_skills')
    .update(patch)
    .eq('id', id)
    .select(`
      id, level, endorsements_count, is_top_skill, years_of_experience,
      description, certificate_url, certificate_filename,
      skills:skill_id ( id, name, category )
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ skill: data })
}

/**
 * DELETE /api/profile/skills?id=<user_skill_id>
 */
export async function DELETE(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: existing } = await supabase
    .from('user_skills')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('user_skills')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}