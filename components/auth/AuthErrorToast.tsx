'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function AuthErrorToast() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  useEffect(() => {
    const error = searchParams.get('error')
    
    if (error) {
      // Map Supabase/OAuth errors to human-readable text
      let message = 'An error occurred during authentication.'
      
      if (error === 'access_denied') message = 'Authentication was cancelled or denied.'
      if (error === 'auth_error') message = 'Failed to authenticate with the provider.'
      if (error === 'missing_code') message = 'Invalid authentication response.'
      
      toast.error(message, { duration: 5000 })
      
      // Clean up the URL so the error doesn't show again on refresh
      router.replace('/login', { scroll: false })
    }
  }, [searchParams, router])

  return null
}