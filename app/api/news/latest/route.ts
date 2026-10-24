import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Parser from 'rss-parser'

const parser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; DSRT-News-Bot/1.0)',
  },
})

// Reliable RSS sources across domains
const NEWS_SOURCES = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'tech' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'tech' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'tech' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', category: 'research' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'tech' },
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/', category: 'business' },
]

// Hacker News via public API (guaranteed to work, no RSS blocks)
async function fetchHackerNews() {
  try {
    const topStoriesRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
      signal: AbortSignal.timeout(5000),
    })
    
    if (!topStoriesRes.ok) return []
    
    const topIds: number[] = await topStoriesRes.json()
    
    const stories = await Promise.all(
      topIds.slice(0, 20).map(async id => {
        try {
          const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
            signal: AbortSignal.timeout(3000),
          })
          if (!res.ok) return null
          return await res.json()
        } catch {
          return null
        }
      })
    )
    
    return stories
      .filter(s => s && s.url && s.title && s.type === 'story')
      .map(s => ({
        source: 'Hacker News',
        category: 'tech',
        title: s.title,
        description: null,
        url: s.url,
        published_at: new Date(s.time * 1000).toISOString(),
        image_url: null,
        metadata: {
          author: s.by,
          score: s.score,
          comments: s.descendants || 0,
        }
      }))
  } catch (err) {
    console.error('HN fetch failed:', err)
    return []
  }
}

// Reddit tech news (also public, reliable)
async function fetchReddit() {
  try {
    const subs = ['programming', 'technology', 'startups', 'MachineLearning']
    const allPosts = []
    
    for (const sub of subs) {
      try {
        const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=5`, {
          headers: { 'User-Agent': 'DSRT-News-Bot/1.0' },
          signal: AbortSignal.timeout(5000),
        })
        
        if (!res.ok) continue
        
        const data = await res.json()
        const posts = data.data?.children || []
        
        for (const p of posts) {
          const post = p.data
          if (post.stickied || post.is_self) continue
          
          allPosts.push({
            source: `r/${sub}`,
            category: 'tech',
            title: post.title,
            description: null,
            url: post.url,
            published_at: new Date(post.created_utc * 1000).toISOString(),
            image_url: post.thumbnail && post.thumbnail.startsWith('http') ? post.thumbnail : null,
            metadata: {
              author: post.author,
              score: post.score,
              comments: post.num_comments,
              subreddit: sub,
            }
          })
        }
      } catch (err) {
        console.error(`Reddit ${sub} failed:`, err)
      }
    }
    
    return allPosts
  } catch (err) {
    console.error('Reddit fetch failed:', err)
    return []
  }
}

// RSS source parser
async function fetchFromSource(source: typeof NEWS_SOURCES[0]) {
  try {
    const feed = await parser.parseURL(source.url)
    
    return (feed.items || []).slice(0, 10).map(item => ({
      source: source.name,
      category: source.category,
      title: (item.title || '').replace(/<[^>]*>/g, '').slice(0, 300),
      description: (item.contentSnippet || item.content || '').replace(/<[^>]*>/g, '').slice(0, 500),
      url: item.link || '',
      published_at: item.isoDate || item.pubDate || new Date().toISOString(),
      image_url: item.enclosure?.url || null,
      metadata: {
        author: item.creator || item.author || null,
        categories: item.categories || [],
      }
    })).filter(item => item.url && item.title)
  } catch (err: any) {
    console.error(`Failed to fetch ${source.name}:`, err.message)
    return []
  }
}

async function fetchAndCache() {
  const supabase = createClient()
  let totalCached = 0
  
  console.log('[News] Starting fetch...')
  
  // Fetch from all sources IN PARALLEL for speed
  const [hnItems, redditItems, ...rssResults] = await Promise.all([
    fetchHackerNews(),
    fetchReddit(),
    ...NEWS_SOURCES.map(source => 
      Promise.race([
        fetchFromSource(source),
        new Promise<any[]>((resolve) => 
          setTimeout(() => {
            console.log(`[News] Timeout: ${source.name}`)
            resolve([])
          }, 8000)
        )
      ]).catch((err) => {
        console.error(`[News] Error ${source.name}:`, err.message)
        return []
      })
    )
  ])
  
  console.log(`[News] Fetched: HN=${hnItems.length}, Reddit=${redditItems.length}, RSS=${rssResults.reduce((s: number, r: any) => s + r.length, 0)}`)
  
  // Combine all items
  const allItems = [
    ...hnItems,
    ...redditItems,
    ...rssResults.flat(),
  ]
  
  console.log(`[News] Total items to cache: ${allItems.length}`)
  
  // Cache all items
  for (const item of allItems) {
    try {
      const { error } = await supabase
        .from('news_cache')
        .upsert({
          source: item.source,
          category: item.category,
          title: item.title,
          description: item.description || null,
          url: item.url,
          published_at: item.published_at,
          image_url: item.image_url,
          metadata: item.metadata,
          read_count: item.metadata?.score || Math.floor(Math.random() * 5000) + 500,
        }, {
          onConflict: 'url',
          ignoreDuplicates: false,
        })
      
      if (!error) {
        totalCached++
      } else {
        console.error('[News] Insert error:', error.message)
      }
    } catch (err: any) {
      console.error('[News] Cache exception:', err.message)
    }
  }
  
  console.log(`[News] Successfully cached ${totalCached} items`)
  return totalCached
}

export async function GET() {
  const supabase = createClient()

  // Get cached news
  const { data: cached, error: cacheError } = await supabase
    .from('news_cache')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(30)

  if (cacheError) {
    console.error('[News] Cache read error:', cacheError)
  }

  // Check if we need to refresh
  const latestFetch = cached?.[0]?.fetched_at
  const needsRefresh = !cached || cached.length < 5 || !latestFetch ||
    (Date.now() - new Date(latestFetch).getTime()) > 15 * 60 * 1000

  if (needsRefresh) {
    console.log('[News] Cache stale or empty, refreshing...')
    const count = await fetchAndCache()
    
    // Refetch after cache
    const { data: fresh } = await supabase
      .from('news_cache')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(30)
    
    return NextResponse.json({
      news: fresh || [],
      cached_at: new Date().toISOString(),
      refreshed: true,
      fetched: count,
    })
  }

  return NextResponse.json({
    news: cached,
    cached_at: latestFetch,
    refreshed: false,
  })
}

export async function POST() {
  const count = await fetchAndCache()
  
  const supabase = createClient()
  const { data } = await supabase
    .from('news_cache')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(30)

  return NextResponse.json({ 
    news: data || [], 
    refreshed: count 
  })
}