import { VentureDetailPage } from '@/components/venture-detail/VentureDetailPage'
import { CocoPageInjector } from '@/components/coco/CocoPageInjector'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function VentureSlugPage({ params }: Props) {
  const { slug } = await params
  
  return (
    <>
      <CocoPageInjector 
        page="venture" 
        entity={{ type: 'venture', id: slug }} 
        component={{ registry_id: 'venture.overview' }} 
      />
      <VentureDetailPage slug={slug} />
    </>
  )
}