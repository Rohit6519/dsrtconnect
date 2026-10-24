import { AssessmentShell } from '@/components/venture-assessment/AssessmentShell'
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string; step: string }>
}

export default async function AssessmentStepPage({ params }: Props) {
  const { slug, step: stepStr } = await params
  const step = parseInt(stepStr, 10)

  if (isNaN(step) || step < 1 || step > 10) {
    redirect(`/ventures/${slug}/assessment/1`)
  }

  return <AssessmentShell slug={slug} step={step} />
}