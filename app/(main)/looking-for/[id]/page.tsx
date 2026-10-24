import { OpportunityDetailPage } from '@/components/looking-for/v2/detail/OpportunityDetailPage'
import { CocoPageInjector } from '@/components/coco/CocoPageInjector'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  return (
    <>
      <CocoPageInjector 
        page="opportunity" 
        entity={{ type: 'opportunity', id: id }} 
        component={{ registry_id: 'opportunity.detail' }} 
      />
      <OpportunityDetailPage id={id} />
    </>
  )
}