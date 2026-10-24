// ============================================================
// lib/coco/context/resolvers/knowledge.ts
// L6 — Retrieved knowledge (RAG).
// Now live using pgvector KB.
// ============================================================

import type { KnowledgeContext } from '@/types/coco'
import { retrieveKnowledge, shouldQueryKnowledgeBase } from '@/lib/coco/knowledge/retriever'

export async function resolveKnowledge(
  query: string,
  entityType?: string
): Promise<KnowledgeContext | undefined> {
  if (!query) return undefined
  if (!shouldQueryKnowledgeBase(query)) return undefined

  const snippets = await retrieveKnowledge({
    query,
    limit: 4,
    minSimilarity: 0.35,
  })

  if (snippets.length === 0) return undefined

  return {
    snippets: snippets.map((s) => ({
      source: `${s.docCategory}/${s.docSlug}#${s.docTitle}`,
      content: s.content,
      trust: 'retrieved',
      relevance_score: s.similarity,
    })),
  }
}