import { Metadata } from 'next'
import { ManageRequestPage } from '@/components/looking-for/manage/ManageRequestPage'

export const metadata: Metadata = {
  title: 'Manage request · DSRT',
}

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ source?: string }>
}

export default async function Page({ params, searchParams }: Props) {
  const { id } = await params
  const { source } = await searchParams
  return <ManageRequestPage id={id} source={source || 'team_up'} />
}
