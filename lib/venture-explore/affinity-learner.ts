/**
 * Client-side affinity learner.
 * Batches interactions and sends them to the /track endpoint.
 * Automatically updates user_domain_affinity server-side.
 */

interface InteractionEvent {
  venture_id: string
  action: 'view' | 'click' | 'follow' | 'save' | 'dismiss' | 'share'
  domain_slugs?: string[]
  session_id?: string
}

const WEIGHTS: Record<string, number> = {
  view: 0.5,       // Passive impression (autofire)
  click: 2.0,      // Click into venture detail
  follow: 5.0,     // Strong positive
  save: 4.0,       // Strong positive
  share: 3.0,      // Positive
  dismiss: -3.0,   // Negative signal
}

class AffinityLearnerClass {
  private queue: InteractionEvent[] = []
  private timer: ReturnType<typeof setTimeout> | null = null
  private sessionId: string

  constructor() {
    this.sessionId = this.getOrCreateSession()
  }

  private getOrCreateSession(): string {
    if (typeof window === 'undefined') return ''
    let sid = sessionStorage.getItem('dsrt_explore_session')
    if (!sid) {
      sid = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      sessionStorage.setItem('dsrt_explore_session', sid)
    }
    return sid
  }

  track(event: InteractionEvent) {
    this.queue.push({ ...event, session_id: this.sessionId })
    this.scheduleFlush()
  }

  private scheduleFlush() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.flush(), 1200)
  }

  private async flush() {
    if (this.queue.length === 0) return
    const batch = this.queue.splice(0, this.queue.length)
    
    try {
      await fetch('/api/ventures/explore/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          interactions: batch.map(e => ({
            ...e,
            weight: WEIGHTS[e.action] ?? 1.0
          }))
        }),
        keepalive: true,
      })
    } catch (e) {
      // Silent failure — analytics shouldn't crash the app
      console.debug('Track failed', e)
    }
  }

  // Called on page unload to flush pending events
  flushImmediate() {
    if (this.queue.length === 0) return
    const batch = this.queue.splice(0, this.queue.length)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({
        interactions: batch.map(e => ({ ...e, weight: WEIGHTS[e.action] ?? 1.0 }))
      })], { type: 'application/json' })
      navigator.sendBeacon('/api/ventures/explore/track', blob)
    }
  }
}

// Singleton
let instance: AffinityLearnerClass | null = null
export function getAffinityLearner(): AffinityLearnerClass {
  if (typeof window === 'undefined') {
    return {
      track: () => {},
      flushImmediate: () => {},
    } as any
  }
  if (!instance) instance = new AffinityLearnerClass()
  return instance
}