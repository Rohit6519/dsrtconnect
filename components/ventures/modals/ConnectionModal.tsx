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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Handshake, CurrencyDollar, Users, Storefront, Star } from '@phosphor-icons/react'

const types = [
  { id: 'general', label: 'General', icon: Handshake, color: 'blue' },
  { id: 'investor', label: 'Investor', icon: CurrencyDollar, color: 'green' },
  { id: 'partner', label: 'Partnership', icon: Users, color: 'purple' },
  { id: 'customer', label: 'Customer', icon: Storefront, color: 'orange' },
  { id: 'talent', label: 'Join Team', icon: Star, color: 'cyan' },
]

interface ConnectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  venture: any
  onSent: () => void
}

export function ConnectionModal({ open, onOpenChange, venture, onSent }: ConnectionModalProps) {
  const supabase = createClient()
  const [type, setType] = useState('general')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Message is required')
      return
    }

    setSending(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Please log in')
      return
    }

    const { error } = await supabase
      .from('venture_connections')
      .insert({
        venture_id: venture.id,
        user_id: user.id,
        message: message.trim(),
        type,
        status: 'pending',
      })

    setSending(false)

    if (error) {
      if (error.code === '23505') {
        toast.error('You already sent a connection request')
      } else {
        toast.error('Failed to send: ' + error.message)
      }
    } else {
      toast.success('Connection request sent!')
      onSent()
      setMessage('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect with {venture.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            The team at {venture.name} will be notified. If they accept, you can start a conversation.
          </p>

          {/* Type */}
          <div className="space-y-2">
            <Label>I want to connect as</Label>
            <div className="grid grid-cols-5 gap-2">
              {types.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={cn(
                      'p-2.5 border rounded-lg flex flex-col items-center gap-1.5 transition-all',
                      type === t.id
                        ? 'border-primary bg-primary/10'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', `text-${t.color}-500`)} weight="fill" />
                    <span className="text-[10px] font-medium text-center leading-tight">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself and share why you want to connect..."
              rows={5}
              maxLength={1000}
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {message.length} / 1000
            </p>
          </div>

          <div className="flex gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending || !message.trim()} className="flex-1">
              {sending ? 'Sending...' : 'Send Connection Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}