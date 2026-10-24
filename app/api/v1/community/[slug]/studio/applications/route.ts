import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, NotFoundError, ForbiddenError } from '@/lib/kernel'
import { hasCommunityPermission, COMMUNITY_PERMISSIONS } from '@/lib/community/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let ctx
  try {
    const { slug } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    const { data: community } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!community) throw new NotFoundError('Community', slug)

    const canReview = await hasCommunityPermission(
      supabase,
      ctx.identityId,
      community.id,
      COMMUNITY_PERMISSIONS.APPLICATION_REVIEW
    )
    if (!canReview) throw new ForbiddenError('Not allowed')

    const status = req.nextUrl.searchParams.get('status') || 'SUBMITTED,UNDER_REVIEW'
    const statuses = status.split(',')

    const { data: apps, error } = await supabase
      .from('community_applications')
      .select('*')
      .eq('community_id', community.id)
      .in('status', statuses)
      .order('submitted_at', { ascending: false })
      .limit(60)

    if (error) throw error

    const applicantIds = Array.from(new Set((apps || []).map((a: any) => a.identity_id)))
    const [{ data: applicants }, { data: answers }] = await Promise.all([
      applicantIds.length > 0
        ? supabase
            .from('users')
            .select('id, username, full_name, avatar_url, tagline, is_verified')
            .in('id', applicantIds)
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from('community_application_answers')
        .select('*')
        .in(
          'application_id',
          (apps || []).map((a: any) => a.id)
        ),
    ])

    const applicantMap = new Map((applicants || []).map((u: any) => [u.id, u]))
    const answersMap = new Map<string, any[]>()
    for (const a of (answers || []) as any[]) {
      const arr = answersMap.get(a.application_id) || []
      arr.push(a)
      answersMap.set(a.application_id, arr)
    }

    const enriched = (apps || []).map((a: any) => ({
      ...a,
      applicant: applicantMap.get(a.identity_id) ?? null,
      answers: answersMap.get(a.id) || [],
    }))

    return ok({ items: enriched }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}