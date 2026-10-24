import { LookingForPageV2 } from '@/components/looking-for/v2/LookingForPageV2'
import { DsrtPage } from '@/components/dsrt'

export const dynamic = 'force-dynamic'

export default function LookingForPage() {
  return (
    <DsrtPage width="wide" padding="none" className="min-h-full">
      <LookingForPageV2 />
    </DsrtPage>
  )
}