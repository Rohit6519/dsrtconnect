import type { Metadata } from 'next'
import { AuthLayout } from '@/components/auth/AuthLayout'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Log in — DSRT',
  description: 'Log in to DSRT to continue building.',
}

export default function LoginPage() {
  return <AuthLayout initialView="signin" />
}