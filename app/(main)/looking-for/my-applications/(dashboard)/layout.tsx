import { ApplicantDashboardShell } from '@/components/looking-for/applicant-dashboard/ApplicantDashboardShell'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ApplicantDashboardShell>{children}</ApplicantDashboardShell>
}