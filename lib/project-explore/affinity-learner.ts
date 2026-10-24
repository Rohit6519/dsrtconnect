// ============================================================================
// PROJECT AFFINITY LEARNER
// ============================================================================
//
// Client-side event batcher.
// Batches user interactions (view, click, save, dismiss, share) into a queue
// and sends them to /api/projects/explore/track every 1.2s, or immediately
// on page unload via sendBeacon.
// ============================================================================

interface InteractionEvent {
  project_id: string
  action: 'view' | 'click' | 'follow' | 'save' | 'dismiss' | 'share' | 'long_view'
  domain_slugs?: string[]
  session_id?: string
}

const WEIGHTS: Record<string, number> = {
  view: 0.5,        // Passive impression (fires on card viewport intersect)
  long_view: 1.5,   // Card in viewport for >3s
  click: 2.0,       // Clicked into project detail
  follow: 5.0,      // Strong positive
  save: 4.0,        // Strong positive
  share: 3.0,       // Positive
  dismiss: -3.0,    // Negative signal
}

class ProjectAffinityLearnerClass {
  private queue: InteractionEvent[] = []
  private timer: ReturnType<typeof setTimeout> | null = null
  private sessionId: string

  constructor() {
    this.sessionId = this.getOrCreateSession()
  }

  private getOrCreateSession(): string {
    if (typeof window === 'undefined') return ''
    let sid = sessionStorage.getItem('dsrt_project_explore_session')
    if (!sid) {
      sid = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      sessionStorage.setItem('dsrt_project_explore_session', sid)
    }
    return sid
  }

  getSessionId(): string {
    return this.sessionId
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
      await fetch('/api/projects/explore/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interactions: batch.map(e => ({
            ...e,
            weight: WEIGHTS[e.action] ?? 1.0,
          })),
        }),
        keepalive: true,
      })
    } catch (e) {
      // Silent — analytics shouldn't crash the app
      console.debug('[ProjectAffinityLearner] Track failed', e)
    }
  }

  // Fired on beforeunload — use sendBeacon for reliability
  flushImmediate() {
    if (this.queue.length === 0) return
    const batch = this.queue.splice(0, this.queue.length)

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob(
        [JSON.stringify({
          interactions: batch.map(e => ({ ...e, weight: WEIGHTS[e.action] ?? 1.0 })),
        })],
        { type: 'application/json' }
      )
      navigator.sendBeacon('/api/projects/explore/track', blob)
    }
  }
}

// ─── SINGLETON ───
let instance: ProjectAffinityLearnerClass | null = null

export function getProjectAffinityLearner(): ProjectAffinityLearnerClass {
  if (typeof window === 'undefined') {
    return {
      track: () => {},
      flushImmediate: () => {},
      getSessionId: () => '',
    } as any
  }
  if (!instance) instance = new ProjectAffinityLearnerClass()
  return instance
}