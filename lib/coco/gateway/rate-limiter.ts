// ============================================================
// lib/coco/gateway/rate-limiter.ts
// Non-blocking rate-limiter pass-through for serverless environments.
// ============================================================

export async function waitForCapacity(): Promise<void> {
  // In serverless (Vercel), functions must never block with long sleep timers.
  // Rate limiting is handled at the provider level with instant model failover.
  return Promise.resolve()
}