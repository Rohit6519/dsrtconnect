'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  intervalMs?: number
  children?: React.ReactNode
}

export function AutoRefresh({ intervalMs = 30000, children }: Props) {
  const router = useRouter()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }

    timerRef.current = setInterval(refresh, intervalMs)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [router, intervalMs])

  return <>{children}</>
}