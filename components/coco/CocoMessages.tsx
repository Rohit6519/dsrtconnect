// ============================================================
// components/coco/CocoMessages.tsx
// ============================================================

'use client'

import { useEffect, useRef } from 'react'
import type { CocoUiMessage } from '@/lib/coco/sdk/types'
import { CocoActionCard } from './CocoActionCard'
import { CocoMarkdown } from './CocoMarkdown'
import { CocoMessageActions } from './CocoMessageActions'
import { cn } from '@/lib/utils'

interface Props {
  messages: CocoUiMessage[]
  onConfirmAction: (id: string) => void
  onCancelAction: (id: string) => void
  onRateMessage: (messageId: string, rating: 1 | -1 | 0) => void
}

export function CocoMessages({
  messages,
  onConfirmAction,
  onCancelAction,
  onRateMessage,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 200
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages])

  if (messages.length === 0) {
    return (
      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-auto scrollbar-hide flex flex-col items-center justify-center px-6 py-8"
      >
        <div className="text-center max-w-[300px]">
          <h3 className="text-[16px] font-semibold text-white/90 tracking-tight">
            Hello.
          </h3>
          <p className="text-[13px] text-white/50 mt-2 leading-relaxed">
            I can see this page. Ask about anything on DSRT or beyond.
          </p>
        </div>

        <div className="w-full max-w-[320px] mt-6 space-y-1.5">
          {['What am I looking at?', 'Summarize this page', 'What can you do?'].map(
            (s) => (
              <button
                key={s}
                className="w-full text-left px-3.5 py-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-[12.5px] text-white/70 hover:text-white/95 transition-colors"
              >
                {s}
              </button>
            )
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollContainerRef}
      className="h-full overflow-y-auto scrollbar-hide px-4 pt-4 pb-2"
      style={{ overscrollBehavior: 'contain' }}
    >
      <div className="space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div className={cn('max-w-[92%]', msg.role === 'user' ? '' : 'w-full')}>
              {msg.content.kind === 'text' && (
                <>
                  {msg.role === 'user' ? (
                    <div className="px-4 py-2.5 rounded-2xl bg-white/[0.08] text-white/95 text-[13.5px] leading-relaxed border border-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      {msg.content.text}
                    </div>
                  ) : (
                    <div>
                      <CocoMarkdown content={msg.content.text} />
                      {msg.streaming && (
                        <span className="inline-block w-[6px] h-[13px] bg-white/60 ml-0.5 align-middle animate-pulse rounded-sm" />
                      )}
                      {!msg.streaming &&
                        msg.content.text &&
                        msg.content.text.length > 0 && (
                          <CocoMessageActions
                            messageId={msg.id}
                            content={msg.content.text}
                            feedback={msg.feedback}
                            onRate={(r) => onRateMessage(msg.id, r)}
                          />
                        )}
                    </div>
                  )}
                </>
              )}

              {msg.pendingAction && (
                <CocoActionCard
                  action={msg.pendingAction}
                  onConfirm={() => onConfirmAction(msg.pendingAction!.actionRunId)}
                  onCancel={() => onCancelAction(msg.pendingAction!.actionRunId)}
                />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  )
}