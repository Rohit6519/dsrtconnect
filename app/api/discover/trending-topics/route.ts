import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()

  try {
    // Get all tags from communities & posts
    const { data: communities } = await supabase
      .from('communities')
      .select('tags, category')
      .eq('is_public', true)

    // Aggregate tag counts
    const tagCounts: Record<string, number> = {}
    
    ;(communities || []).forEach((c: any) => {
      // Count tags
      if (Array.isArray(c.tags)) {
        c.tags.forEach((tag: string) => {
          const key = tag.toLowerCase().trim()
          if (key) tagCounts[key] = (tagCounts[key] || 0) + 1
        })
      }
      // Also count categories
      if (c.category) {
        const key = c.category.toLowerCase().trim()
        tagCounts[key] = (tagCounts[key] || 0) + 1
      }
    })

    // Get posts count per tag (if you track hashtags in posts)
    const { data: posts } = await supabase
      .from('posts')
      .select('content')
      .limit(500)

    ;(posts || []).forEach((p: any) => {
      if (!p.content) return
      const hashtags = p.content.match(/#\w+/g) || []
      hashtags.forEach((tag: string) => {
        const key = tag.slice(1).toLowerCase()
        tagCounts[key] = (tagCounts[key] || 0) + 1
      })
    })

    // Sort by count and get top 5
    const topics = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([tag, count]) => ({
        tag: tag.charAt(0).toUpperCase() + tag.slice(1),
        slug: tag,
        count,
        count_label: count >= 1000 ? `${(count/1000).toFixed(1)}K` : `${count}`,
      }))

    return NextResponse.json({ topics })
  } catch (error) {
    return NextResponse.json({ topics: [] })
  }
}