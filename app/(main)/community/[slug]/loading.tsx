import { PageShell, LoadingState } from '@/components/kernel-ui'

export default function Loading() {
  return (
    <PageShell width="wide">
      <LoadingState label="Loading community…" />
    </PageShell>
  )
}