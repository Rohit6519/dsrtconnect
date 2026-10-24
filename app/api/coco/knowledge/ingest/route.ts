// ============================================================
// app/api/coco/knowledge/ingest/route.ts
// Admin ingest for DSRT Knowledge Base.
// ============================================================

import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { chunkDocument } from '@/lib/coco/knowledge/chunker'
import { generateEmbedding } from '@/lib/coco/knowledge/embeddings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

interface IngestPayload {
  slug: string
  title: string
  category: string
  content: string
  source_url?: string
}

/**
 * POST /api/coco/knowledge/ingest
 * Body: { docs: IngestPayload[] }  or  { slug, title, category, content }
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const docs: IngestPayload[] = Array.isArray(body.docs) ? body.docs : [body]

    const results: any[] = []

    for (const doc of docs) {
      if (!doc.slug || !doc.title || !doc.category || !doc.content) {
        results.push({ slug: doc.slug, error: 'missing_fields' })
        continue
      }

      // Upsert doc
      const { data: existing } = await adminClient
        .from('coco_knowledge_docs')
        .select('id, version')
        .eq('slug', doc.slug)
        .maybeSingle()

      let docId: string
      let newVersion = 1

      if (existing) {
        docId = existing.id
        newVersion = (existing.version || 1) + 1
        await adminClient
          .from('coco_knowledge_docs')
          .update({
            title: doc.title,
            category: doc.category,
            source_url: doc.source_url || null,
            version: newVersion,
            is_active: true,
          })
          .eq('id', docId)

        // Delete old chunks
        await adminClient.from('coco_knowledge_chunks').delete().eq('doc_id', docId)
      } else {
        const { data: newDoc, error: insertErr } = await adminClient
          .from('coco_knowledge_docs')
          .insert({
            slug: doc.slug,
            title: doc.title,
            category: doc.category,
            source_url: doc.source_url || null,
          })
          .select('id')
          .single()

        if (insertErr || !newDoc) {
          results.push({ slug: doc.slug, error: insertErr?.message || 'insert_failed' })
          continue
        }
        docId = newDoc.id
      }

      // Chunk + embed
      const chunks = chunkDocument(doc.content)
      const rows: any[] = []
      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk.content)
        rows.push({
          doc_id: docId,
          chunk_index: chunk.index,
          content: chunk.content,
          content_tokens: chunk.tokenCount,
          embedding,
        })
      }

      if (rows.length > 0) {
        const { error: chunkErr } = await adminClient
          .from('coco_knowledge_chunks')
          .insert(rows)
        if (chunkErr) {
          results.push({ slug: doc.slug, error: chunkErr.message })
          continue
        }
      }

      results.push({
        slug: doc.slug,
        docId,
        chunks: chunks.length,
        version: newVersion,
      })
    }

    return NextResponse.json({ ok: true, results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}