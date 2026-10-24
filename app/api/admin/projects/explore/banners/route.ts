import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Admin check helper
async function requireAdmin(supabase: any, user: any) {
  if (!user) return false
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  return profile?.role === 'admin'
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!(await requireAdmin(supabase, user))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data } = await supabase
    .from('project_explore_banners')
    .select('*')
    .order('priority', { ascending: true })

  return NextResponse.json({ banners: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!(await requireAdmin(supabase, user))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    if (!body.title || !body.image_url) {
      return NextResponse.json({ error: 'title and image_url required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_explore_banners')
      .insert({
        title: String(body.title).slice(0, 200),
        subtitle: body.subtitle || null,
        image_url: body.image_url,
        mobile_image_url: body.mobile_image_url || null,
        cta_label: body.cta_label || null,
        cta_route: body.cta_route || null,
        priority: typeof body.priority === 'number' ? body.priority : 0,
        is_active: body.is_active !== false,
        starts_at: body.starts_at || null,
        ends_at: body.ends_at || null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, banner: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!(await requireAdmin(supabase, user))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id, ...patch } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const allowed: Record<string, any> = {}
    const keys = ['title', 'subtitle', 'image_url', 'mobile_image_url', 'cta_label', 'cta_route', 'priority', 'is_active', 'starts_at', 'ends_at']
    for (const k of keys) {
      if (k in patch) allowed[k] = patch[k]
    }
    allowed.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('project_explore_banners')
      .update(allowed)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, banner: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!(await requireAdmin(supabase, user))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await supabase
      .from('project_explore_banners')
      .delete()
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}