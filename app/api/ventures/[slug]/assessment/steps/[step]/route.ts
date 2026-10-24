import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/ventures/[slug]/assessment/steps/[step]
 * Body: partial step data
 * Autosaves partial answers, upserts, and marks step progress.
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ slug: string; step: string }> }
) {
  const { slug, step: stepStr } = await context.params
  const step = parseInt(stepStr, 10)
  if (isNaN(step) || step < 1 || step > 10) {
    return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: venture } = await supabase
    .from('ventures')
    .select('id, user_id, founder_id, assessment_current_step')
    .eq('slug', slug)
    .maybeSingle()

  if (!venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (venture.user_id !== user.id && venture.founder_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const markCompleted = body._markCompleted === true
  const advanceStep = body._advanceStep === true

  try {
    let result: any = {}

    switch (step) {
      case 1:
        result = await saveStep1_Venture(supabase, venture.id, body)
        break
      case 2:
        result = await saveStep2_Problem(supabase, venture.id, body)
        break
      case 3:
        result = await saveStep3_Insight(supabase, venture.id, body)
        break
      case 4:
        result = await saveStep4_Customer(supabase, venture.id, body)
        break
      case 5:
        result = await saveStep5_Solution(supabase, venture.id, body)
        break
      case 6:
        result = await saveStep6_Market(supabase, venture.id, body)
        break
      case 7:
        result = await saveStep7_Competition(supabase, venture.id, body)
        break
      case 8:
        result = await saveStep8_FounderTeam(supabase, venture.id, user.id, body)
        break
      case 9:
        result = await saveStep9_RealityCheck(supabase, venture.id, body)
        break
      case 10:
        result = await saveStep10_NextMove(supabase, venture.id, body)
        break
    }

    // Update assessment progression
    if (markCompleted || advanceStep) {
      const { data: assessment } = await supabase
        .from('venture_assessments')
        .select('completed_steps, current_step')
        .eq('venture_id', venture.id)
        .maybeSingle()

      const completed = new Set<number>(assessment?.completed_steps || [])
      if (markCompleted) completed.add(step)

      const nextStep = advanceStep && step < 10 ? step + 1 : (assessment?.current_step || step)

      const completedArr: number[] = Array.from(completed).sort((a: number, b: number) => a - b)

      await supabase
        .from('venture_assessments')
        .update({
          completed_steps: completedArr,
          current_step: nextStep,
        })
        .eq('venture_id', venture.id)

      await supabase
        .from('ventures')
        .update({ assessment_current_step: nextStep, last_activity_at: new Date().toISOString() })
        .eq('id', venture.id)
    }

    return NextResponse.json({ success: true, step, data: result })
  } catch (e: any) {
    console.error(`Step ${step} save error:`, e)
    return NextResponse.json({ error: e?.message || 'Save failed' }, { status: 500 })
  }
}

// ═════════════════════════════════════════════════════════════════════
// STEP HANDLERS
// ═════════════════════════════════════════════════════════════════════

async function saveStep1_Venture(supabase: any, ventureId: string, body: any) {
  const patch: Record<string, any> = { updated_at: new Date().toISOString() }
  if ('name' in body) patch.name = String(body.name).slice(0, 120)
  if ('tagline' in body) patch.tagline = String(body.tagline || '').slice(0, 200) || null
  if ('description' in body) patch.description = String(body.description || '').slice(0, 3000) || null
  if ('logo_url' in body) patch.logo_url = body.logo_url || null
  if ('cover_url' in body) patch.cover_url = body.cover_url || null
  if ('stage' in body) patch.stage = body.stage
  if ('industry' in body) patch.industry = String(body.industry || '').slice(0, 100) || null
  if ('sector' in body) patch.sector = String(body.sector || '').slice(0, 100) || null
  if ('sub_category' in body) patch.sub_category = String(body.sub_category || '').slice(0, 100) || null

  const { data } = await supabase
    .from('ventures')
    .update(patch)
    .eq('id', ventureId)
    .select()
    .single()
  return data
}

async function saveStep2_Problem(supabase: any, ventureId: string, body: any) {
  const row: Record<string, any> = { venture_id: ventureId }
  if ('problem_statement' in body) row.problem_statement = body.problem_statement || null
  if ('affected_audience' in body) row.affected_audience = body.affected_audience || null
  if ('problem_context' in body) row.problem_context = body.problem_context || null
  if ('impact_tags' in body) row.impact_tags = Array.isArray(body.impact_tags) ? body.impact_tags : []
  if ('impact_explanation' in body) row.impact_explanation = body.impact_explanation || null
  if ('discovery_source' in body) row.discovery_source = body.discovery_source || null
  if ('discovery_details' in body) row.discovery_details = body.discovery_details || null

  const { data } = await supabase
    .from('venture_problems')
    .upsert(row, { onConflict: 'venture_id' })
    .select()
    .single()
  return data
}

async function saveStep3_Insight(supabase: any, ventureId: string, body: any) {
  const row: Record<string, any> = { venture_id: ventureId }
  const fields = ['why_worth_solving', 'supporting_observations', 'overlooked_understanding', 'evolved_thinking', 'falsifiable_evidence']
  for (const f of fields) if (f in body) row[f] = body[f] || null

  const { data } = await supabase
    .from('venture_insights')
    .upsert(row, { onConflict: 'venture_id' })
    .select()
    .single()
  return data
}

async function saveStep4_Customer(supabase: any, ventureId: string, body: any) {
  const row: Record<string, any> = { venture_id: ventureId }
  const fields = ['first_customer', 'why_change_behavior', 'user_persona', 'decision_maker', 'buyer_persona']
  for (const f of fields) if (f in body) row[f] = body[f] || null

  const { data } = await supabase
    .from('venture_customer_profiles')
    .upsert(row, { onConflict: 'venture_id' })
    .select()
    .single()
  return data
}

async function saveStep5_Solution(supabase: any, ventureId: string, body: any) {
  const row: Record<string, any> = { venture_id: ventureId }
  const fields = ['solution_description', 'how_it_solves_problem', 'user_flow_before', 'user_flow_action', 'user_flow_product', 'user_flow_outcome', 'mvp_definition', 'build_risk_explanation']
  for (const f of fields) if (f in body) row[f] = body[f] || null
  if ('build_risk_tags' in body) row.build_risk_tags = Array.isArray(body.build_risk_tags) ? body.build_risk_tags : []

  const { data } = await supabase
    .from('venture_solutions')
    .upsert(row, { onConflict: 'venture_id' })
    .select()
    .single()
  return data
}

async function saveStep6_Market(supabase: any, ventureId: string, body: any) {
  const row: Record<string, any> = { venture_id: ventureId }
  const fields = ['initial_market', 'market_size_estimate', 'estimation_methodology', 'serviceable_market', 'broader_opportunity', 'distribution_rationale']
  for (const f of fields) if (f in body) row[f] = body[f] || null
  if ('distribution_channels' in body) row.distribution_channels = Array.isArray(body.distribution_channels) ? body.distribution_channels : []

  const { data } = await supabase
    .from('venture_markets')
    .upsert(row, { onConflict: 'venture_id' })
    .select()
    .single()
  return data
}

async function saveStep7_Competition(supabase: any, ventureId: string, body: any) {
  const row: Record<string, any> = { venture_id: ventureId }
  const fields = ['why_choose_us', 'why_reject_us', 'moat_from_larger_players']
  for (const f of fields) if (f in body) row[f] = body[f] || null

  const { data } = await supabase
    .from('venture_differentiation')
    .upsert(row, { onConflict: 'venture_id' })
    .select()
    .single()
  return data
}

async function saveStep8_FounderTeam(supabase: any, ventureId: string, userId: string, body: any) {
  const founderRow: Record<string, any> = { venture_id: ventureId, user_id: userId }
  const founderFields = ['why_solve_this', 'relevant_experience', 'founder_advantage', 'what_to_learn']
  for (const f of founderFields) if (f in body) founderRow[f] = body[f] || null

  const { data: founderAnswers } = await supabase
    .from('venture_founder_answers')
    .upsert(founderRow, { onConflict: 'venture_id,user_id' })
    .select()
    .single()

  const capRow: Record<string, any> = { venture_id: ventureId }
  if ('capability_map' in body) capRow.capability_map = body.capability_map || {}
  if ('most_critical_gap' in body) capRow.most_critical_gap = body.most_critical_gap || null

  const { data: capabilities } = await supabase
    .from('venture_capabilities')
    .upsert(capRow, { onConflict: 'venture_id' })
    .select()
    .single()

  return { founder_answers: founderAnswers, capabilities }
}

async function saveStep9_RealityCheck(supabase: any, ventureId: string, body: any) {
  const row: Record<string, any> = { venture_id: ventureId }
  const fields = ['biggest_risk', 'risk_category', 'strategy_pivot_trigger']
  for (const f of fields) if (f in body) row[f] = body[f] || null

  const { data } = await supabase
    .from('venture_risks')
    .upsert(row, { onConflict: 'venture_id' })
    .select()
    .single()
  return data
}

async function saveStep10_NextMove(supabase: any, ventureId: string, body: any) {
  const row: Record<string, any> = { venture_id: ventureId }
  const fields = ['most_important_proof', 'proof_action_plan', 'thirty_day_focus', 'biggest_blocker']
  for (const f of fields) if (f in body) row[f] = body[f] || null

  const { data } = await supabase
    .from('venture_next_moves')
    .upsert(row, { onConflict: 'venture_id' })
    .select()
    .single()
  return data
}