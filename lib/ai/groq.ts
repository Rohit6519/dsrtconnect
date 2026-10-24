import Groq from 'groq-sdk'

// Multiple API keys for load balancing
const API_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_BACKUP_1,
  process.env.GROQ_API_KEY_BACKUP_2,
].filter(Boolean) as string[]

if (API_KEYS.length === 0) {
  console.warn('No Groq API keys configured')
}

// Available models with their characteristics
export const MODELS = {
  BEST_QUALITY: 'llama-3.3-70b-versatile',    // Complex reasoning, mentor
  FAST: 'llama-3.1-8b-instant',                // Quick responses, classification
  LONG_CONTEXT: 'mixtral-8x7b-32768',          // Long documents
  BALANCED: 'llama-3.1-70b-versatile',         // General purpose
  BACKUP: 'gemma2-9b-it',                      // Fallback
} as const

// Simple round-robin key rotation
let keyIndex = 0
function getNextKey(): string {
  const key = API_KEYS[keyIndex]
  keyIndex = (keyIndex + 1) % API_KEYS.length
  return key
}

// Rate limit tracking per key
const keyUsage = new Map<string, { count: number; resetAt: number }>()

function isKeyAvailable(key: string): boolean {
  const usage = keyUsage.get(key)
  if (!usage) return true
  if (Date.now() > usage.resetAt) {
    keyUsage.delete(key)
    return true
  }
  return usage.count < 25 // Stay under 30/min limit
}

function trackUsage(key: string) {
  const usage = keyUsage.get(key) || { count: 0, resetAt: Date.now() + 60000 }
  usage.count++
  keyUsage.set(key, usage)
}

function getBestAvailableKey(): string | null {
  // Try to find an available key
  for (let i = 0; i < API_KEYS.length; i++) {
    const key = getNextKey()
    if (isKeyAvailable(key)) return key
  }
  return null
}

export interface ChatOptions {
  model?: keyof typeof MODELS
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

/**
 * Send a chat completion request with automatic key rotation and fallback
 */
export async function chat(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  options: ChatOptions = {}
) {
  const {
    model = 'BALANCED',
    systemPrompt,
    temperature = 0.7,
    maxTokens = 1024,
  } = options

  const modelId = MODELS[model]
  const finalMessages = systemPrompt
    ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
    : messages

  const key = getBestAvailableKey()
  if (!key) {
    throw new Error('All API keys are rate limited. Try again in a minute.')
  }

  const groq = new Groq({ apiKey: key })
  trackUsage(key)

  try {
    const completion = await groq.chat.completions.create({
      messages: finalMessages,
      model: modelId,
      temperature,
      max_tokens: maxTokens,
    })

    return {
      content: completion.choices[0]?.message?.content || '',
      model: modelId,
      usage: completion.usage,
    }
  } catch (error: any) {
    // If this model fails, try backup
    if (error.status === 429 || error.status === 503) {
      console.warn(`${modelId} rate limited, falling back to backup`)
      return chat(messages, { ...options, model: 'BACKUP' })
    }
    throw error
  }
}

/**
 * Stream a chat completion (for real-time typing effect)
 */
export async function chatStream(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  options: ChatOptions = {}
) {
  const {
    model = 'BALANCED',
    systemPrompt,
    temperature = 0.7,
    maxTokens = 1024,
  } = options

  const modelId = MODELS[model]
  const finalMessages = systemPrompt
    ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
    : messages

  const key = getBestAvailableKey()
  if (!key) {
    throw new Error('All API keys are rate limited')
  }

  const groq = new Groq({ apiKey: key })
  trackUsage(key)

  return await groq.chat.completions.create({
    messages: finalMessages,
    model: modelId,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  })
}

/**
 * Quick classification/extraction using fast model
 */
export async function quickCompletion(
  prompt: string,
  options: { maxTokens?: number } = {}
) {
  return chat(
    [{ role: 'user', content: prompt }],
    { 
      model: 'FAST',
      temperature: 0.3,
      maxTokens: options.maxTokens || 200,
    }
  )
}

/**
 * Get usage stats (for admin dashboard)
 */
export function getUsageStats() {
  const stats: Record<string, any> = {}
  keyUsage.forEach((usage, key) => {
    const keyPreview = key.slice(0, 12) + '...'
    stats[keyPreview] = {
      requests_this_minute: usage.count,
      resets_at: new Date(usage.resetAt).toISOString(),
    }
  })
  return {
    total_keys: API_KEYS.length,
    active_keys: keyUsage.size,
    usage: stats,
  }
}