import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: org } = await supabase.from('organizations').select('id').eq('slug', params.slug).single()
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { name, tagline, description, sector, category, tech_stack, tags, stage, visibility } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const baseSlug = slugify(name)
  const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`

  const { data, error } = await supabase.from('projects').insert({
    name: name.trim(),
    slug: uniqueSlug,
    tagline: tagline?.trim() || null,
    description: description?.trim() || null,
    sector: sector || null,
    category: Array.isArray(category) ? category : [],
    tech_stack: Array.isArray(tech_stack) ? tech_stack : [],
    stage: stage || 'building',
    visibility: visibility || 'public',
    is_public: visibility !== 'private',
    founder_id: user.id,
    user_id: user.id,
    organization_id: org.id,
    status: 'active',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ project: data })
}