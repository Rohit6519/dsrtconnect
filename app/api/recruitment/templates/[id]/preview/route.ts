import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TemplateEngine } from '@/lib/recruitment/TemplateEngine'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tpl } = await supabase
    .from('recruitment_templates').select('*').eq('id', id).single()
  if (!tpl) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const preview = await TemplateEngine.preview({
    template_key: tpl.template_key,
    subject: body.subject || tpl.subject,
    body_markdown: body.body_markdown || tpl.body_markdown,
    application_id: body.application_id,
    opportunity_id: body.opportunity_id || tpl.opportunity_id,
  })

  return NextResponse.json(preview)
}