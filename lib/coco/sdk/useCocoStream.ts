// ============================================================
// lib/coco/sdk/useCocoStream.ts
// SSE + universal client action bridge + feedback.
// ============================================================

'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { CocoStreamEvent, ConversationId } from '@/types/coco'
import type { CocoUiMessage, CocoLifecycleState } from './types'
import { getCocoContext } from './context-registry'
import { dispatchCocoComponentAction, getCocoComponent } from './component-registry'

export function useCocoStream() {
  const router = useRouter()
  const [messages, setMessages] = useState<CocoUiMessage[]>([])
  const [state, setState] = useState<CocoLifecycleState>('idle')
  const [conversationId, setConversationId] = useState<ConversationId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const executeClientAction = useCallback(
    async (output: any) => {
      if (!output || typeof output !== 'object') return
      const action = output.action
      const route = output.route || output.path

      if (action === 'client_navigate' || (route && String(route).startsWith('/'))) {
        setTimeout(() => router.push(String(route)), 100)
        return
      }
      if (action === 'client_component_act') {
        await dispatchCocoComponentAction(
          String(output.component_id || ''),
          String(output.component_action || ''),
          output.payload
        )
        return
      }
      if (action === 'client_component_get_state') {
        const comp = getCocoComponent(String(output.component_id || ''))
        try { comp?.getState?.() } catch {}
        return
      }
      if (action === 'client_mail_compose') {
        window.dispatchEvent(new CustomEvent('coco:mail:open-compose'))
        return
      }
      if (action === 'client_mail_fill_recipient') {
        window.dispatchEvent(new CustomEvent('coco:mail:fill-recipient', { detail: { recipient: output.recipient } }))
        return
      }
      if (action === 'client_mail_fill_subject') {
        window.dispatchEvent(new CustomEvent('coco:mail:fill-subject', { detail: { subject: output.subject } }))
        return
      }
      if (action === 'client_mail_fill_body') {
        window.dispatchEvent(new CustomEvent('coco:mail:fill-body', { detail: { body: output.body } }))
        return
      }
      if (action === 'client_ui_fill') {
        await waitAndFillField(`[data-coco-field="${output.field_id}"]`, output.value, 2000)
        return
      }
      if (action === 'client_ui_select') {
        window.dispatchEvent(new CustomEvent('coco:select', {
          detail: { componentId: output.component_id, optionKey: output.option_key },
        }))
      }
    },
    [router]
  )

  const sendMessage = useCallback(
    async (text: string) => {
      if (state !== 'idle') return
      setError(null)
      setState('sending')

      const userMsg: CocoUiMessage = {
        id: `local-${Date.now()}`, role: 'user',
        content: { kind: 'text', text }, createdAt: Date.now(),
      }
      setMessages((prev) => [...prev, userMsg])

      const assistantMsg: CocoUiMessage = {
        id: `local-a-${Date.now()}`, role: 'assistant',
        content: { kind: 'text', text: '' }, createdAt: Date.now(), streaming: true,
      }
      setMessages((prev) => [...prev, assistantMsg])

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const response = await fetch('/api/coco/messages/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversationId,
            text,
            context_hint: getCocoContext(),
          }),
          signal: controller.signal,
        })
        if (!response.ok || !response.body) throw new Error(`Stream failed: ${response.status}`)
        setState('streaming')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() || ''
          for (const part of parts) {
            if (!part.startsWith('data: ')) continue
            const jsonStr = part.slice(6)
            try {
              const event: CocoStreamEvent = JSON.parse(jsonStr)
              switch (event.event) {
                case 'stream.start':
                  setConversationId(event.data.conversation_id)
                  setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, serverMessageId: event.data.assistant_message_id } : m))
                  break
                case 'message.delta':
                  accumulated += event.data.text
                  setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, content: { kind: 'text', text: accumulated } } : m))
                  break
                case 'action.proposed':
                  setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? {
                    ...m,
                    pendingAction: {
                      actionRunId: event.data.action_run_id,
                      toolName: event.data.tool_name,
                      summary: event.data.summary,
                      status: event.data.requires_confirmation ? 'pending' : 'executing',
                    },
                  } : m))
                  break
                case 'action.confirmation_required': setState('awaiting_confirmation'); break
                case 'action.completed':
                  setMessages((prev) => prev.map((m) => m.pendingAction?.actionRunId === event.data.action_run_id ? { ...m, pendingAction: { ...m.pendingAction!, status: 'completed' } } : m))
                  break
                case 'action.failed':
                  setMessages((prev) => prev.map((m) => m.pendingAction?.actionRunId === event.data.action_run_id ? { ...m, pendingAction: { ...m.pendingAction!, status: 'failed' } } : m))
                  break
                case 'action.client_bridge':
                  await executeClientAction(event.data.output)
                  break
                case 'error': setError(event.data.message); setState('error'); break
                default: break
              }
            } catch {}
          }
        }

        setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, streaming: false } : m))
        setState('idle')
      } catch (err: any) {
        if (err.name === 'AbortError') setState('idle')
        else { setError(err.message); setState('error') }
      }
    },
    [state, conversationId, executeClientAction]
  )

  const confirmAction = useCallback(async (actionRunId: string) => {
    setState('executing')
    try {
      const res = await fetch(`/api/coco/actions/${actionRunId}/confirm`, { method: 'POST' })
      const json = await res.json()
      if (json.data?.result?.output) await executeClientAction(json.data.result.output)
      setMessages((prev) => prev.map((m) => m.pendingAction?.actionRunId === actionRunId ? { ...m, pendingAction: { ...m.pendingAction!, status: json.data?.success ? 'completed' : 'failed' } } : m))
      setState('idle')
    } catch (err: any) { setError(err.message); setState('error') }
  }, [executeClientAction])

  const cancelAction = useCallback(async (actionRunId: string) => {
    try {
      await fetch(`/api/coco/actions/${actionRunId}/cancel`, { method: 'POST' })
      setMessages((prev) => prev.map((m) => m.pendingAction?.actionRunId === actionRunId ? { ...m, pendingAction: { ...m.pendingAction!, status: 'cancelled' } } : m))
      setState('idle')
    } catch {}
  }, [])

  // FEEDBACK
  const rateMessage = useCallback(
    async (messageId: string, rating: 1 | -1 | 0) => {
      // Optimistic UI
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m))
      )

      // Persist
      const msg = messages.find((m) => m.id === messageId)
      try {
        await fetch('/api/coco/messages/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message_id: msg?.serverMessageId || undefined,
            local_message_id: msg?.serverMessageId ? undefined : messageId,
            conversation_id: conversationId,
            rating,
          }),
        })
      } catch {
        // Silent — UI already updated optimistically
      }
    },
    [messages, conversationId]
  )

  const stop = useCallback(() => { abortRef.current?.abort(); setState('idle') }, [])
  const reset = useCallback(() => { abortRef.current?.abort(); setMessages([]); setConversationId(null); setState('idle'); setError(null) }, [])

  return {
    messages, state, error, conversationId,
    sendMessage, confirmAction, cancelAction, stop, reset, executeClientAction, rateMessage,
  }
}

async function waitForElement(selector: string, timeoutMs = 3000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLElement>(selector)
    if (existing) return resolve(existing)
    const observer = new MutationObserver(() => {
      const el = document.querySelector<HTMLElement>(selector)
      if (el) { observer.disconnect(); resolve(el) }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    setTimeout(() => { observer.disconnect(); resolve(null) }, timeoutMs)
  })
}

async function waitAndFillField(selector: string, value: string, timeoutMs = 3000) {
  const el = await waitForElement(selector, timeoutMs)
  if (!el) return
  const input = el as HTMLInputElement | HTMLTextAreaElement
  const proto = input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
  input.focus()
}