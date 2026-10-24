import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(
    { error: 'Seed endpoint disabled — DSRT is live for real users' },
    { status: 403 }
  )
}