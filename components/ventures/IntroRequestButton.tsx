'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Handshake } from 'lucide-react'

interface IntroRequestButtonProps {
  founderId: string
  ventureId: string
  ventureName: string
}

export function IntroRequestButton({
  founderId,
  ventureId,
  ventureName,
}: IntroRequestButtonProps) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) return
    setSending(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('intro_requests').insert({
      from_user_id: user!.id,
      to_user_id: founderId,
      venture_id: ventureId,
      message: message.trim(),
    })

    setSending(false)
    setSent(true)
    setTimeout(() => setOpen(false), 1500)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        <Handshake className="w-4 h-4 mr-2" />
        Request Intro
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Intro to Founder</DialogTitle>
          </DialogHeader>

          {sent ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium">Intro request sent</p>
              <p className="text-xs text-muted-foreground">
                The founder will be notified. You&apos;ll get a response soon.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/30 p-3 text-sm">
                <p className="text-xs text-muted-foreground mb-1">
                  Requesting intro to founder of
                </p>
                <p className="font-semibold">{ventureName}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Your intro message
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hi, I'm interested in your venture because... I'd love to explore how we could work together / I could invest / help with..."
                  rows={5}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/500
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                  className="flex-1"
                >
                  {sending ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}