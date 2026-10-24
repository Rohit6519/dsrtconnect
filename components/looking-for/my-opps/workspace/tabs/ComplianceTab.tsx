'use client'
import { ComplianceDashboard } from '@/components/looking-for/my-opps/compliance/ComplianceDashboard'

export function ComplianceTab({ opportunityId }: { opportunityId: string }) {
  return <ComplianceDashboard opportunityId={opportunityId} />
}