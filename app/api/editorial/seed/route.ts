import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  // Only allow in development or with manual flag
  const url = new URL(request.url)
  const manual = url.searchParams.get('manual') === 'true'

  if (process.env.NODE_ENV === 'production' && !manual) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const results = []
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`${baseUrl}/api/editorial/generate?manual=true`)
      const data = await res.json()
      results.push(data)
      await new Promise((r) => setTimeout(r, 1500))
    } catch (err) {
      console.error('Seed error:', err)
    }
  }

  return NextResponse.json({
    success: true,
    iterations: results.length,
    results,
  })
}