// ============================================================
// lib/coco/gateway/models.ts
// Production model IDs — ONLY models verified on this account.
// Source of truth: GET https://api.groq.com/openai/v1/models
// ============================================================

/**
 * Verified chat models for the current Groq account.
 * Updated from live /v1/models listing (no Llama access on this key).
 */
export const COCO_GROQ_MODELS = {
  // Fast / cheap / high RPM
  FAST: process.env.COCO_GROQ_MODEL_FAST || 'openai/gpt-oss-20b',
  // Default conversation + tools
  GENERAL: process.env.COCO_GROQ_MODEL_GENERAL || 'openai/gpt-oss-20b',
  // Heavier reasoning
  REASONING: process.env.COCO_GROQ_MODEL_REASONING || 'openai/gpt-oss-120b',
  // Last-resort Groq fallback (still on this account)
  FALLBACK: process.env.COCO_GROQ_MODEL_FALLBACK || 'openai/gpt-oss-20b',
} as const

/** Ordered cascade — every ID must exist on THIS account */
export const COCO_GROQ_CASCADE = Array.from(
  new Set([
    COCO_GROQ_MODELS.FAST,
    COCO_GROQ_MODELS.GENERAL,
    COCO_GROQ_MODELS.REASONING,
    COCO_GROQ_MODELS.FALLBACK,
    // Optional preview fallbacks if env allows
    process.env.COCO_GROQ_MODEL_PREVIEW_1 || 'qwen/qwen3.6-27b',
  ].filter(Boolean))
)

export const COCO_OPENAI_MODELS = {
  FAST: process.env.COCO_OPENAI_MODEL_FAST || 'gpt-4o-mini',
  GENERAL: process.env.COCO_OPENAI_MODEL_GENERAL || 'gpt-4o-mini',
  REASONING: process.env.COCO_OPENAI_MODEL_REASONING || 'gpt-4o',
} as const