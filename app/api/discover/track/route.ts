import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { signal_type, entity_type, entity_id, metadata } = body

  if (!signal_type || !entity_type || !entity_id) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 })
  }

  try {
    await supabase.rpc("track_user_signal", {
      p_user_id: user.id,
      p_signal_type: signal_type,
      p_entity_type: entity_type,
      p_entity_id: entity_id,
      p_metadata: metadata || {},
    })
  } catch (e: any) {
    console.error("Signal tracking error:", e)
  }

  return NextResponse.json({ ok: true })
}