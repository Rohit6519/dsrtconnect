import { NextResponse } from 'next/server'
import { TRIGGERS, CONDITIONS, ACTIONS, DELAYS } from '@/lib/automation/RuleRegistry'
export const dynamic = 'force-dynamic'
export async function GET() {
  return NextResponse.json({ triggers: TRIGGERS, conditions: CONDITIONS, actions: ACTIONS, delays: DELAYS })
}