import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 300

export async function GET() {
  const supabase = await createClient()
  try {
    const { data, error } = await supabase
      .from('resource_categories')
      .select('*')
      .order('position', { ascending: true })
    if (error) throw error
    return NextResponse.json({ categories: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, categories: [] }, { status: 500 })
  }
}
