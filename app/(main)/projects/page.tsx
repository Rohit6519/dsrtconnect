import { ProjectsDashboard } from '@/components/projects/ProjectsDashboard'
import { DsrtPage } from '@/components/dsrt'

export const metadata = {
  title: 'Projects | DSRT Connect',
  description: 'Build, collaborate and ship amazing projects together.',
}

export default function ProjectsPage() {
  return (
    <DsrtPage width="wide" padding="none" className="min-h-full py-4 sm:py-6">
      <ProjectsDashboard />
    </DsrtPage>
  )
}