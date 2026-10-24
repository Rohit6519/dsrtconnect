'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2 } from 'lucide-react'

export function RefreshBriefingButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    try {
      await fetch('/api/editorial/generate?manual=true')
      router.refresh()
    } catch {}
    setLoading(false)
  }

  return (
    <Button
      onClick={handleRefresh}
      disabled={loading}
      variant="outline"
      size="sm"
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          Fetching...
        </>
      ) : (
        <>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </>
      )}
    </Button>
  )
}