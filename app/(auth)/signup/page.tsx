import type { Metadata } from 'next'
import { AuthLayout } from '@/components/auth/AuthLayout'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sign up — DSRT',
  description: 'Join the intelligent network for builders, projects, and ventures.',
}

export default function SignupPage() {
  return <AuthLayout initialView="signup" />
}