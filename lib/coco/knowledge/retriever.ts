// ============================================================
// lib/coco/knowledge/retriever.ts
// Query the DSRT Knowledge Base semantically.
// ============================================================

import { adminClient } from '@/lib/supabase/admin'
import { generateEmbedding } from './embeddings'

export interface KnowledgeSnippet {
  chunkId: string
  docId: string
  docSlug: string
  docTitle: string
  docCategory: string
  content: string
  similarity: number
}

export interface RetrieveOptions {
  query: string
  limit?: number
  minSimilarity?: number
  category?: string
}

/**
 * Semantic search over the DSRT Knowledge Base.
 * Returns top matching chunks with source citations.
 */
export async function retrieveKnowledge(
  opts: RetrieveOptions
): Promise<KnowledgeSnippet[]> {
  const { query, limit = 4, minSimilarity = 0.35, category } = opts

  if (!query || query.trim().length === 0) return []

  try {
    const embedding = await generateEmbedding(query)

    // Query the KB via the coco_kb_search Postgres function
    const { data, error } = await adminClient.rpc('coco_kb_search', {
      query_embedding: embedding,
      match_threshold: minSimilarity,
      match_count: limit,
    })

    if (error) {
      console.warn('[COCO KB] Search failed:', error.message)
      return []
    }

    let results: KnowledgeSnippet[] = (data || []).map((row: any) => ({
      chunkId: row.chunk_id,
      docId: row.doc_id,
      docSlug: row.doc_slug,
      docTitle: row.doc_title,
      docCategory: row.doc_category,
      content: row.content,
      similarity: row.similarity,
    }))

    if (category) {
      results = results.filter((r) => r.docCategory === category)
    }

    return results
  } catch (err) {
    console.error('[COCO KB] Retrieval error:', err)
    return []
  }
}

/**
 * Determine if a user query is likely answerable from the KB.
 * Uses simple heuristics to avoid unnecessary embedding calls.
 */
export function shouldQueryKnowledgeBase(userMessage: string): boolean {
  const msg = userMessage.toLowerCase().trim()
  if (msg.length < 5) return false

  // Skip pure commands and personal queries
  const skipPatterns = [
    /^(take me|open|go to|navigate|switch to|show me my)/,
    /^(hi|hello|hey|thanks|thank you|ok|okay|bye|sup|yo)$/,
    /^(what is my |who am i|show my )/,
  ]
  for (const pat of skipPatterns) {
    if (pat.test(msg)) return false
  }

  // Trigger patterns
  const triggerPatterns = [
    /\b(how|what|why|when|where|which|who)\b/,
    /\b(banner|dimension|size|logo|avatar|design|rule|guideline|policy)\b/,
    /\b(project|venture|community|opportunity|assessment|mail|profile) (guide|help|about|means|is|are)\b/,
    /\b(difference between|explain|understand|clarify)\b/,
    /\?$/,
  ]
  for (const pat of triggerPatterns) {
    if (pat.test(msg)) return true
  }

  return false
}