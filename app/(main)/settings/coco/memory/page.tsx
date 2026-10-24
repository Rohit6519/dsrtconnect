// ============================================================
// app/(main)/settings/coco/memory/page.tsx
// ============================================================
import { CocoMemorySettings } from '@/components/settings/CocoMemorySettings'
import { DsrtPage, DsrtSection } from '@/components/dsrt'

export const metadata = {
  title: 'COCO Memory | Settings',
}

export default function Page() {
  return (
    <DsrtPage width="narrow">
      <DsrtSection>
        <CocoMemorySettings />
      </DsrtSection>
    </DsrtPage>
  )
}