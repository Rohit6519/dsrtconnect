import { StudioShell } from '@/components/looking-for/studio/StudioShell'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params
  return <StudioShell draftId={draftId} />
}