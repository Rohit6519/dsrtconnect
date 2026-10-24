import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const VALID_TYPES = [
  'short_text',
  'long_text',
  'single_choice',
  'multi_choice',
  'checkbox',
  'url',
  'number',
  'date',
  'file',
  'project_select',
  'venture_select',
  'skill_select',
]

async function assertOwner(supabase: any, userId: string, oppId: string) {
  const { data } = await supabase
    .from('opportunities')
    .select('poster_user_id')
    .eq('id', oppId)
    .single()
  if (!data) return { ok: false, code: 404 as const }
  if (data.poster_user_id !== userId) return { ok: false, code: 403 as const }
  return { ok: true as const }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertOwner(supabase, user.id, id)
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.code === 404 ? 'Not found' : 'Forbidden' },
      { status: gate.code }
    )
  }

  const { data, error } = await supabase
    .from('opportunity_application_questions')
    .select('*, options:opportunity_application_question_options(*)')
    .eq('opportunity_id', id)
    .order('order_index', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ questions: data || [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertOwner(supabase, user.id, id)
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.code === 404 ? 'Not found' : 'Forbidden' },
      { status: gate.code }
    )
  }

  const body = await req.json().catch(() => ({}))
  const question_type = String(body.question_type || '')
  const label = String(body.label || '').trim()

  if (!VALID_TYPES.includes(question_type)) {
    return NextResponse.json({ error: 'Invalid question_type' }, { status: 400 })
  }
  if (!label) {
    return NextResponse.json({ error: 'label required' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('opportunity_application_questions')
    .select('order_index')
    .eq('opportunity_id', id)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextOrder =
    existing && existing.length > 0 ? (existing[0].order_index || 0) + 1 : 0

  const { data: question, error } = await supabase
    .from('opportunity_application_questions')
    .insert({
      opportunity_id: id,
      question_type,
      label,
      description: body.description || null,
      is_required: !!body.is_required,
      order_index: nextOrder,
      configuration: body.configuration || {},
      conditions: body.conditions || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (Array.isArray(body.options) && body.options.length > 0) {
    const rows = body.options
      .map((o: any, i: number) => ({
        question_id: question.id,
        label: String(o.label || o.value || '').trim(),
        value: String(o.value || o.label || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_'),
        order_index: i,
      }))
      .filter((r: any) => r.label)
    if (rows.length > 0) {
      await supabase.from('opportunity_application_question_options').insert(rows)
    }
  }

  const { data: full } = await supabase
    .from('opportunity_application_questions')
    .select('*, options:opportunity_application_question_options(*)')
    .eq('id', question.id)
    .single()

  return NextResponse.json({ question: full })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertOwner(supabase, user.id, id)
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.code === 404 ? 'Not found' : 'Forbidden' },
      { status: gate.code }
    )
  }

  const body = await req.json().catch(() => ({}))

  if (Array.isArray(body.reorder) && body.reorder.length > 0) {
    let updated = 0
    for (const r of body.reorder) {
      if (!r?.id || typeof r.order_index !== 'number') continue
      const { error } = await supabase
        .from('opportunity_application_questions')
        .update({ order_index: r.order_index })
        .eq('id', r.id)
        .eq('opportunity_id', id)
      if (!error) updated++
    }
    return NextResponse.json({ ok: true, reordered: updated })
  }

  const question_id = String(body.question_id || '')
  if (!question_id) {
    return NextResponse.json({ error: 'question_id required' }, { status: 400 })
  }

  if (Array.isArray(body.options)) {
    await supabase
      .from('opportunity_application_question_options')
      .delete()
      .eq('question_id', question_id)

    const rows = body.options
      .map((o: any, i: number) => ({
        question_id,
        label: String(o.label || o.value || '').trim(),
        value: String(o.value || o.label || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_'),
        order_index: i,
      }))
      .filter((r: any) => r.label)

    if (rows.length > 0) {
      await supabase.from('opportunity_application_question_options').insert(rows)
    }
    return NextResponse.json({ ok: true, options_updated: rows.length })
  }

  const patch: any = {}
  const p = body.patch || {}
  if (typeof p.label === 'string') patch.label = p.label
  if (typeof p.description === 'string' || p.description === null) {
    patch.description = p.description
  }
  if (typeof p.is_required === 'boolean') patch.is_required = p.is_required
  if (p.configuration !== undefined) patch.configuration = p.configuration
  if (p.conditions !== undefined) patch.conditions = p.conditions

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, unchanged: true })
  }

  const { data, error } = await supabase
    .from('opportunity_application_questions')
    .update(patch)
    .eq('id', question_id)
    .eq('opportunity_id', id)
    .select('*, options:opportunity_application_question_options(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ question: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertOwner(supabase, user.id, id)
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.code === 404 ? 'Not found' : 'Forbidden' },
      { status: gate.code }
    )
  }

  const question_id = new URL(req.url).searchParams.get('question_id')
  if (!question_id) {
    return NextResponse.json({ error: 'question_id required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('opportunity_application_questions')
    .delete()
    .eq('id', question_id)
    .eq('opportunity_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}