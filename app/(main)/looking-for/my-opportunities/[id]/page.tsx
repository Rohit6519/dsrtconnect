import { WorkspaceShell } from '@/components/looking-for/my-opps/workspace/WorkspaceShell'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <WorkspaceShell opportunityId={id} />
}