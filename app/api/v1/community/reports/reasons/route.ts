import { ok } from '@/lib/kernel'
import { REPORT_REASONS } from '@/lib/community/service.moderation'

export const dynamic = 'force-static'

export async function GET() {
  const labels: Record<string, { label: string; description: string }> = {
    SPAM: { label: 'Spam', description: 'Repeated, unwanted, or promotional content.' },
    HARASSMENT: { label: 'Harassment', description: 'Targeted insults, threats, or bullying.' },
    ABUSE: { label: 'Abuse', description: 'Cruel or abusive behavior.' },
    HATE: { label: 'Hate speech', description: 'Content attacking people based on identity.' },
    MISINFORMATION: { label: 'Misinformation', description: 'False or misleading claims.' },
    SCAM: { label: 'Scam or fraud', description: 'Deceptive schemes or fraud.' },
    ILLEGAL_CONTENT: { label: 'Illegal content', description: 'Content that breaks the law.' },
    OFF_TOPIC: { label: 'Off-topic', description: 'Not relevant to this community.' },
    IMPERSONATION: { label: 'Impersonation', description: 'Pretending to be someone else.' },
    OTHER: { label: 'Other', description: 'Something else — please describe.' },
  }
  return ok({
    reasons: REPORT_REASONS.map((r) => ({ code: r, ...labels[r] })),
  })
}