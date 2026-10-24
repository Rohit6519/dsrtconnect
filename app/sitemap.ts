import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://dsrtai.com'

  const staticPages = [
    '',
    '/login',
    '/signup',
    '/feed',
    '/explore',
    '/community',
    '/pulse',
    '/projects',
    '/ventures',
    '/school',
    '/mentor',
    '/leaderboard',
    '/games',
  ]

  return staticPages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: path === '' ? 1 : 0.8,
  }))
}