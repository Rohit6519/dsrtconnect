import { ProjectDetailPage } from '@/components/project-detail/ProjectDetailPage'
import { CocoPageInjector } from '@/components/coco/CocoPageInjector'

export const dynamic = 'force-dynamic'

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  
  return (
    <>
      <CocoPageInjector 
        page="project" 
        entity={{ type: 'project', id: slug }} 
        component={{ registry_id: 'project.overview' }} 
      />
      <ProjectDetailPage slug={slug} />
    </>
  )
}