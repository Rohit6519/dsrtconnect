'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { MessageCircle, Loader2 } from 'lucide-react'

interface MessageButtonProps {
  otherUserId: string
}

export function MessageButton({ otherUserId }: MessageButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)

    try {
      const { data, error } = await supabase.rpc(
        'get_or_create_dm_conversation',
        {
          other_user_id: otherUserId,
        }
      )

      if (error) {
        console.error('RPC error:', error)
        alert('Could not start conversation: ' + error.message)
        setLoading(false)
        return
      }

      // Success — redirect to messages
      router.push('/messages')
    } catch (err: any) {
      console.error(err)
      alert('Error: ' + (err.message || 'Unknown error'))
    }

    setLoading(false)
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <MessageCircle className="w-4 h-4 mr-2" />
      )}
      Message
    </Button>
  )
}