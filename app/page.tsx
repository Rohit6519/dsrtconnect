import type { Metadata } from 'next'
import { AuthLayout } from '@/components/auth/AuthLayout'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'DSRT — Build with the right people',
  description: 'Sign in to DSRT and continue building.',
}

export default function RootLandingPage() {
  return <AuthLayout initialView="signin" />
}