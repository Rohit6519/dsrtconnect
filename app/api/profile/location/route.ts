import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/profile/location
 * Body: {
 *   display: string,        // "San Francisco, California, United States"
 *   lat?: number,
 *   lon?: number,
 *   city?: string,
 *   state?: string,
 *   country?: string,
 * }
 */
export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const display = (body.display || '').toString().trim()

  if (!display) {
    // Clearing location
    const { error } = await supabase
      .from('users')
      .update({
        location: null,
        location_data: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, location: null })
  }

  const location_data = {
    display,
    lat: body.lat ?? null,
    lon: body.lon ?? null,
    city: body.city ?? null,
    state: body.state ?? null,
    country: body.country ?? null,
  }

  const { error } = await supabase
    .from('users')
    .update({
      location: display,
      location_data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, location: display, location_data })
}