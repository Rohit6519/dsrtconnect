import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('recruitment_templates').select('*').eq('id', id).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ template: data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: current } = await supabase
    .from('recruitment_templates').select('*').eq('id', id).single()
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (current.is_system) return NextResponse.json({ error: 'System templates cannot be edited' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const allowed: Record<string, boolean> = {
    name: true, description: true, subject: true, body_markdown: true,
    send_mode: true, is_active: true,
  }
  const patch: any = {}
  for (const [k, v] of Object.entries(body)) if (allowed[k]) patch[k] = v
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  // snapshot previous
  await supabase.from('recruitment_template_versions').insert({
    template_id: current.id,
    version: current.version,
    subject: current.subject,
    body_markdown: current.body_markdown,
    send_mode: current.send_mode,
    updated_by: user.id,
  })

  patch.version = (current.version || 1) + 1
  patch.updated_by = user.id

  const { data: updated, error } = await supabase
    .from('recruitment_templates').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: current } = await supabase
    .from('recruitment_templates').select('is_system').eq('id', id).single()
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (current.is_system) return NextResponse.json({ error: 'System templates cannot be deleted' }, { status: 400 })

  const { error } = await supabase.from('recruitment_templates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}