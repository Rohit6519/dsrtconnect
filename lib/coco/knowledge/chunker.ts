// ============================================================
// lib/coco/knowledge/chunker.ts
// Split markdown docs into semantic chunks.
// ============================================================

const TARGET_CHUNK_SIZE = 400 // words
const MAX_CHUNK_SIZE = 600
const OVERLAP_WORDS = 40

export interface Chunk {
  index: number
  content: string
  tokenCount: number
}

export function chunkDocument(text: string): Chunk[] {
  if (!text || text.trim().length === 0) return []

  // Split on markdown headings first
  const sections = splitBySections(text)

  const chunks: Chunk[] = []
  let chunkIndex = 0

  for (const section of sections) {
    const words = section.split(/\s+/).filter(Boolean)

    if (words.length <= MAX_CHUNK_SIZE) {
      chunks.push({
        index: chunkIndex++,
        content: section.trim(),
        tokenCount: estimateTokens(section),
      })
      continue
    }

    // Section is too big — split with overlap
    let start = 0
    while (start < words.length) {
      const end = Math.min(start + TARGET_CHUNK_SIZE, words.length)
      const slice = words.slice(start, end).join(' ')
      chunks.push({
        index: chunkIndex++,
        content: slice.trim(),
        tokenCount: estimateTokens(slice),
      })
      if (end >= words.length) break
      start = end - OVERLAP_WORDS
    }
  }

  return chunks
}

function splitBySections(text: string): string[] {
  // Split at markdown headings (# / ## / ###)
  const lines = text.split('\n')
  const sections: string[] = []
  let current: string[] = []

  for (const line of lines) {
    if (/^#{1,3}\s/.test(line) && current.length > 0) {
      sections.push(current.join('\n'))
      current = [line]
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) sections.push(current.join('\n'))

  return sections.filter((s) => s.trim().length > 0)
}

/**
 * Rough token estimate (1 token ≈ 0.75 words for English).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length / 0.75)
}