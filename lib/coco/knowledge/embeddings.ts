// ============================================================
// lib/coco/knowledge/embeddings.ts
// Embedding generation with intelligent fallbacks.
// ============================================================

import { createHash } from 'crypto'

const EMBEDDING_DIM = 768

/**
 * Generate an embedding vector for the given text.
 * Strategy:
 *   1. Try OpenAI text-embedding-3-small (truncated to 768)
 *   2. Fall back to deterministic hash-based pseudo-embedding
 *      (still enables keyword-style matching, zero cost, no API needed)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = text.trim().slice(0, 8000)
  if (!cleanText) return zeroVector()

  // Try OpenAI first if configured
  if (process.env.OPENAI_API_KEY) {
    try {
      const { default: OpenAI } = await import('openai')
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const res = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: cleanText,
        dimensions: EMBEDDING_DIM,
      })
      const emb = res.data[0]?.embedding
      if (emb && emb.length === EMBEDDING_DIM) return emb
    } catch (err) {
      console.warn('[COCO KB] OpenAI embedding failed, falling back:', (err as Error).message)
    }
  }

  // Fallback: deterministic pseudo-embedding
  return hashEmbedding(cleanText)
}

/**
 * Generate embeddings in batch.
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = []
  for (const text of texts) {
    results.push(await generateEmbedding(text))
  }
  return results
}

/**
 * Fallback: hash-based embedding.
 * Deterministic, no API, poor semantic matching but works for keyword lookup.
 * Uses TF-IDF-inspired sparse projection.
 */
function hashEmbedding(text: string): number[] {
  const vec = new Array(EMBEDDING_DIM).fill(0)
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2)

  for (const token of tokens) {
    const hash = createHash('sha256').update(token).digest()
    // Project each token into ~8 dimensions using hash bytes
    for (let i = 0; i < 8; i++) {
      const byte = hash[i]
      const idx = (byte + i * 32) % EMBEDDING_DIM
      const sign = byte % 2 === 0 ? 1 : -1
      vec[idx] += sign * (1 / Math.sqrt(tokens.length))
    }
  }

  // L2 normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) vec[i] /= norm
  }

  return vec
}

function zeroVector(): number[] {
  return new Array(EMBEDDING_DIM).fill(0)
}