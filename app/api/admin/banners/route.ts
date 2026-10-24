import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET raw config (admin only)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('admin_role')
    .eq('id', user.id)
    .single()

  if (!profile || !['super_admin', 'admin'].includes(profile.admin_role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data, error } = await supabase
      .from('featured_banners_config')
      .select('*')
      .eq('id', 1)
      .single()

    if (error) throw error
    return NextResponse.json({ config: data })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}

// PUT: replace full banners array (admin only)
export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('admin_role')
    .eq('id', user.id)
    .single()

  if (!profile || !['super_admin', 'admin'].includes(profile.admin_role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const banners = body?.banners

    if (!Array.isArray(banners) || banners.length !== 6) {
      return NextResponse.json(
        { error: 'banners must be an array of exactly 6 items' },
        { status: 400 }
      )
    }

    // Validate each slot
    for (let i = 0; i < banners.length; i++) {
      const b = banners[i]
      if (!b || typeof b !== 'object') {
        return NextResponse.json({ error: 'Invalid slot ' + i }, { status: 400 })
      }
      if (!['project', 'custom'].includes(b.type)) {
        return NextResponse.json(
          { error: 'Slot ' + i + ' must have type "project" or "custom"' },
          { status: 400 }
        )
      }
      if (b.type === 'project' && b.active && !b.project_id) {
        return NextResponse.json(
          { error: 'Active project banner slot ' + i + ' requires project_id' },
          { status: 400 }
        )
      }
      if (b.type === 'custom' && b.active && !b.image_url) {
        return NextResponse.json(
          { error: 'Active custom banner slot ' + i + ' requires image_url' },
          { status: 400 }
        )
      }
      b.slot = i + 1
    }

    const { error } = await supabase
      .from('featured_banners_config')
      .update({
        banners,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', 1)

    if (error) throw error

    return NextResponse.json({ success: true, banners })
  } catch (error: any) {
    console.error('Banner update error:', error)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
