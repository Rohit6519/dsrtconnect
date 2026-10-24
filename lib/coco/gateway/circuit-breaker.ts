// ============================================================
// lib/coco/gateway/circuit-breaker.ts
// In-memory circuit breaker for provider health.
// ============================================================

interface ProviderState {
  failures: number
  nextRetryAt: number
}

const states = new Map<string, ProviderState>()

const MAX_FAILURES = 3
const BACKOFF_MS = 30000 // Wait 30s before trying a failing provider/model again

export function isHealthy(providerId: string): boolean {
  const state = states.get(providerId)
  if (!state) return true
  
  if (state.failures >= MAX_FAILURES) {
    if (Date.now() > state.nextRetryAt) {
      // Half-open: allow one request through to test
      return true
    }
    return false // Circuit open
  }
  return true
}

export function recordSuccess(providerId: string) {
  states.delete(providerId)
}

export function recordFailure(providerId: string, isRateLimit = false) {
  const state = states.get(providerId) || { failures: 0, nextRetryAt: 0 }
  
  // Rate limits immediately trip the breaker
  state.failures = isRateLimit ? MAX_FAILURES : state.failures + 1
  
  if (state.failures >= MAX_FAILURES) {
    state.nextRetryAt = Date.now() + BACKOFF_MS
    console.warn(`[COCO Gateway] Circuit broken for ${providerId}. Backing off for ${BACKOFF_MS}ms.`)
  }
  
  states.set(providerId, state)
}