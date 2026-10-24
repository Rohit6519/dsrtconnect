import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ partners: [], total: 0 })
}

export async function POST() {
  return NextResponse.json(
    { error: 'Not implemented' },
    { status: 501 }
  )
}