// ============================================================
// lib/community/metadata.ts
// Server-side metadata for the community detail routes.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export async function generateCommunityMetadata(
  slug: string,
  tabName?: string
): Promise<Metadata> {
  try {
    const supabase = await createClient()
    const { data: c } = await supabase
      .from('communities')
      .select('name, short_description, description, cover_url, banner_url, category, member_count, is_verified, visibility')
      .eq('slug', slug)
      .maybeSingle()

    if (!c) {
      return {
        title: 'Community · DSRT Connect',
        description: 'Explore communities on DSRT Connect.',
      }
    }

    if (c.visibility === 'UNLISTED') {
      return {
        title: 'Community · DSRT Connect',
        robots: { index: false, follow: false },
      }
    }

    const title = tabName ? `${tabName} · ${c.name} · DSRT Connect` : `${c.name} · DSRT Connect`
    const description =
      (c.short_description || c.description || '').slice(0, 180) ||
      `${c.name} — a community on DSRT Connect.`
    const image = c.banner_url || c.cover_url || undefined

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        images: image ? [{ url: image }] : undefined,
      },
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        title,
        description,
        images: image ? [image] : undefined,
      },
    }
  } catch {
    return {
      title: 'Community · DSRT Connect',
    }
  }
}