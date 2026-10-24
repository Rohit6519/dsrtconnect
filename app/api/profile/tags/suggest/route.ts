import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Popular tag pool — always suggested, plus we merge with distinct tags from other users
const POPULAR_TAGS = [
  'AI', 'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
  'Founder', 'Co-Founder', 'CEO', 'CTO', 'CPO',
  'Product', 'Design', 'UX', 'UI', 'Product Manager',
  'Engineering', 'Backend', 'Frontend', 'Full-Stack', 'Mobile',
  'Web3', 'Blockchain', 'DeFi', 'Crypto', 'NFT',
  'SaaS', 'B2B', 'B2C', 'Marketplace', 'Fintech',
  'HealthTech', 'EdTech', 'ClimateTech', 'BioTech', 'DeepTech',
  'Robotics', 'Hardware', 'IoT', 'AR/VR', 'Gaming',
  'Investor', 'Angel', 'VC', 'Advisor', 'Mentor',
  'Growth', 'Marketing', 'Sales', 'Operations', 'Finance',
  'Data Science', 'Data Engineering', 'DevOps', 'Cloud', 'Security',
  'Open Source', 'Community', 'Content', 'Writer', 'Speaker',
  'Startup', 'Innovation', 'Entrepreneur', 'Bootstrapper', 'Builder',
]

/**
 * GET /api/profile/tags/suggest?q=<query>
 * Returns matching tags from popular list + distinct tags used by other users
 */
export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim().toLowerCase()

  // Filter popular tags
  const popularMatches = POPULAR_TAGS.filter((t) =>
    !q || t.toLowerCase().includes(q)
  ).slice(0, 20)

  // Pull tags from other users that match
  let dbMatches: string[] = []
  try {
    const { data: userRows } = await supabase
      .from('users')
      .select('profile_tags')
      .not('profile_tags', 'is', null)
      .limit(500)

    const allTags = new Set<string>()
    for (const row of userRows || []) {
      if (Array.isArray(row.profile_tags)) {
        for (const t of row.profile_tags) {
          if (typeof t === 'string' && (!q || t.toLowerCase().includes(q))) {
            allTags.add(t)
          }
        }
      }
    }
    dbMatches = Array.from(allTags)
  } catch {
    // silent fail — popular list is enough
  }

  // Merge, dedupe (case-insensitive), preserve popular order first
  const seen = new Set<string>()
  const merged: string[] = []
  for (const t of [...popularMatches, ...dbMatches]) {
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(t)
    if (merged.length >= 30) break
  }

  return NextResponse.json({ tags: merged })
}