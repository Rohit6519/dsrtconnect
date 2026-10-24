import { AssessmentProvider } from '@/components/venture-assessment/AssessmentContext'
import { AssessmentReview } from '@/components/venture-assessment/steps/AssessmentReview'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function AssessmentReviewPage({ params }: Props) {
  const { slug } = await params

  return (
    <AssessmentProvider slug={slug} initialStep={10}>
      <AssessmentReview />
    </AssessmentProvider>
  )
}