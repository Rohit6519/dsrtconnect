import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PROJECT_DOMAINS, searchProjectDomains } from '@/lib/config/project-domains'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userCategories: string[] = []
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('interests, preferred_categories')
      .eq('id', user.id)
      .maybeSingle()
    userCategories = (profile?.preferred_categories || profile?.interests || []) as string[]
  }

  // Autocomplete mode
  if (query) {
    const results = searchProjectDomains(query, limit)
    return NextResponse.json({
      domains: results,
      userCategories,
    })
  }

  // List mode — user's categories first, then popular, then rest
  const userLower = userCategories.map(c => c.toLowerCase())
  const preferred = PROJECT_DOMAINS.filter(d => userLower.includes(d.name.toLowerCase()))
  const popular = PROJECT_DOMAINS.filter(d =>
    d.popular && !userLower.includes(d.name.toLowerCase())
  )
  const others = PROJECT_DOMAINS.filter(d =>
    !d.popular && !userLower.includes(d.name.toLowerCase())
  )
  const sorted = [...preferred, ...popular, ...others].slice(0, limit)

  return NextResponse.json({
    domains: sorted,
    userCategories,
    total: PROJECT_DOMAINS.length,
  })
}