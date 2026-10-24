import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export async function GET() {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc('get_featured_banners')

    if (error) throw error

    return NextResponse.json({ banners: data || [] })
  } catch (error: any) {
    console.error('Banners error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to load banners', banners: [] },
      { status: 500 }
    )
  }
}
