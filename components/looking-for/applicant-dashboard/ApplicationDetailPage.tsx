'use client'

import { ApplicantPortalShell } from './portal/ApplicantPortalShell'

export function ApplicationDetailPage({ applicationId }: { applicationId: string }) {
  return <ApplicantPortalShell applicationId={applicationId} />
}