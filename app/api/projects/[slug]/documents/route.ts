import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ═══════════════════════════════════════════════════════════════════════════
// DOC TYPE REGISTRY
// Central source of truth: caps + allowed formats per document type.
// Must match the CHECK constraint on project_documents.doc_type from Phase 9.1.
// ═══════════════════════════════════════════════════════════════════════════

interface DocTypeSpec {
  label: string
  maxBytes: number
  mimes: string[]
  extensions: string[]  // for extension-based fallback (some browsers send generic mimes)
}

const DOC_TYPES: Record<string, DocTypeSpec> = {
  pitch_deck: {
    label: 'Pitch Deck',
    maxBytes: 25 * 1024 * 1024, // 25 MB
    mimes: [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.apple.keynote',
      'application/octet-stream', // Keynote sometimes uploads as this — extension fallback catches it
    ],
    extensions: ['pdf', 'ppt', 'pptx', 'key'],
  },
  research_paper: {
    label: 'Research Paper',
    maxBytes: 20 * 1024 * 1024, // 20 MB
    mimes: ['application/pdf'],
    extensions: ['pdf'],
  },
  documentation: {
    label: 'Documentation',
    maxBytes: 15 * 1024 * 1024, // 15 MB
    mimes: [
      'application/pdf',
      'text/markdown',
      'text/plain',
    ],
    extensions: ['pdf', 'md', 'markdown', 'txt'],
  },
  whitepaper: {
    label: 'Whitepaper',
    maxBytes: 15 * 1024 * 1024, // 15 MB
    mimes: ['application/pdf'],
    extensions: ['pdf'],
  },
  press_kit: {
    label: 'Press Kit',
    maxBytes: 30 * 1024 * 1024, // 30 MB
    mimes: [
      'application/zip',
      'application/x-zip-compressed',
      'application/pdf',
    ],
    extensions: ['zip', 'pdf'],
  },
  business_plan: {
    label: 'Business Plan',
    maxBytes: 15 * 1024 * 1024, // 15 MB
    mimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    extensions: ['pdf', 'doc', 'docx'],
  },
}

const BUCKET = 'project-documents'
const MAX_TITLE_LEN = 120
const MAX_FILENAME_LEN = 180

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function isValidDocType(t: unknown): t is keyof typeof DOC_TYPES {
  return typeof t === 'string' && t in DOC_TYPES
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Sanitize a filename so it's safe as a storage path:
 * - strip directory separators
 * - collapse whitespace to dashes
 * - allow only [a-zA-Z0-9._-]
 * - cap length
 * - guarantee non-empty extension
 */
function sanitizeFilename(raw: string): { name: string; ext: string } {
  const trimmed = (raw || 'file').trim().slice(-MAX_FILENAME_LEN)

  // Split extension
  const lastDot = trimmed.lastIndexOf('.')
  const rawExt = lastDot > 0 ? trimmed.slice(lastDot + 1).toLowerCase() : ''
  const rawBase = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed

  const cleanBase = rawBase
    .replace(/[/\\]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'file'

  const cleanExt = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8)

  return { name: cleanBase, ext: cleanExt }
}

/**
 * Get file extension from filename (lowercase, no dot).
 */
function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.slice(lastDot + 1).toLowerCase()
}

/**
 * Validate uploaded file against a doc type spec.
 * Accepts if MIME matches OR extension matches (some browsers report bad MIMEs).
 */
function validateFile(
  file: File,
  spec: DocTypeSpec
): { ok: true } | { ok: false; error: string } {
  if (file.size <= 0) {
    return { ok: false, error: 'File is empty' }
  }
  if (file.size > spec.maxBytes) {
    return {
      ok: false,
      error: `File is too large (${formatBytes(file.size)}). ${spec.label} max is ${formatBytes(spec.maxBytes)}.`,
    }
  }

  const mime = (file.type || '').toLowerCase()
  const ext = getExtension(file.name)

  const mimeOk = spec.mimes.some(m => m.toLowerCase() === mime)
  const extOk = spec.extensions.includes(ext)

  if (!mimeOk && !extOk) {
    return {
      ok: false,
      error: `Invalid file type. ${spec.label} accepts: ${spec.extensions.map(e => '.' + e).join(', ')}`,
    }
  }

  return { ok: true }
}

/**
 * Load project + verify caller is owner.
 * Returns { project, isOwner: true } or NextResponse with error.
 */
async function loadOwnedProject(supabase: any, slug: string, userId: string) {
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, founder_id, user_id, slug, name')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  if (!project) {
    return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) }
  }
  const isOwner = project.founder_id === userId || project.user_id === userId
  if (!isOwner) {
    return { error: NextResponse.json({ error: 'Only the project owner can manage documents' }, { status: 403 }) }
  }
  return { project }
}

/**
 * Load project (readable — used for GET). Enforces visibility.
 */
async function loadReadableProject(supabase: any, slug: string, userId: string | null) {
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, founder_id, user_id, slug, is_public, visibility, status')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  if (!project) {
    return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) }
  }

  const isPublicReadable =
    project.status !== 'draft' &&
    project.status !== 'archived' &&
    (project.is_public || project.visibility === 'public' || project.visibility === 'unlisted')

  let canRead = isPublicReadable

  if (!canRead && userId) {
    if (project.founder_id === userId || project.user_id === userId) {
      canRead = true
    } else {
      const { data: member } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', project.id)
        .eq('user_id', userId)
        .maybeSingle()
      if (member) canRead = true
    }
  }

  if (!canRead) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { project }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET — list all documents for a project (grouped by doc_type)
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const loaded = await loadReadableProject(supabase, slug, user?.id || null)
    if ('error' in loaded) return loaded.error
    const { project } = loaded

    const { data, error } = await supabase
      .from('project_documents')
      .select(`
        id, doc_type, title, file_name, file_url, file_path,
        mime_type, size_bytes, uploaded_by, created_at, updated_at
      `)
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const documents = data || []

    // Group by doc_type for easy consumption on the frontend
    const grouped: Record<string, any[]> = {}
    for (const d of documents) {
      if (!grouped[d.doc_type]) grouped[d.doc_type] = []
      grouped[d.doc_type].push(d)
    }

    // Include upload limits for the UI to reference
    const limits: Record<string, { label: string; maxBytes: number; extensions: string[] }> = {}
    for (const [k, v] of Object.entries(DOC_TYPES)) {
      limits[k] = { label: v.label, maxBytes: v.maxBytes, extensions: v.extensions }
    }

    return NextResponse.json({
      documents,
      grouped,
      limits,
      total: documents.length,
    })
  } catch (error: any) {
    console.error('[documents:GET] Fatal:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to load documents', documents: [], grouped: {}, limits: {}, total: 0 },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST — upload a new document
// Expects multipart/form-data with:
//   - file: File (required)
//   - doc_type: string (required, one of DOC_TYPES keys)
//   - title: string (optional, defaults to filename)
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to upload documents' }, { status: 401 })
  }

  // ─── Parse multipart form data ────────────────────────────────────────
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const docTypeRaw = formData.get('doc_type')
  const titleRaw = formData.get('title')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!isValidDocType(docTypeRaw)) {
    return NextResponse.json(
      {
        error: `Invalid doc_type. Must be one of: ${Object.keys(DOC_TYPES).join(', ')}`,
      },
      { status: 400 }
    )
  }

  const docType = docTypeRaw as keyof typeof DOC_TYPES
  const spec = DOC_TYPES[docType]

  // ─── Validate file ────────────────────────────────────────────────────
  const validation = validateFile(file, spec)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    // ─── Verify project ownership ───────────────────────────────────────
    const loaded = await loadOwnedProject(supabase, slug, user.id)
    if ('error' in loaded) return loaded.error
    const { project } = loaded

    // ─── Build storage path ─────────────────────────────────────────────
    // Convention (must match RLS in Phase 9.1): <project_id>/<doc_type>/<unique-filename>
    const { name: cleanName, ext: cleanExt } = sanitizeFilename(file.name)
    const uniqueSuffix = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
    const storedFilename = `${cleanName}-${uniqueSuffix}${cleanExt ? '.' + cleanExt : ''}`
    const path = `${project.id}/${docType}/${storedFilename}`

    // ─── Upload to Supabase Storage ─────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadErr) {
      console.error('[documents:POST] Storage upload error:', uploadErr)
      // 409 = duplicate path (shouldn't happen with our unique suffix, but handle anyway)
      if ((uploadErr as any).statusCode === '409' || (uploadErr as any).status === 409) {
        return NextResponse.json({ error: 'A file with this name already exists' }, { status: 409 })
      }
      throw uploadErr
    }

    // ─── Get public URL ─────────────────────────────────────────────────
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const publicUrl = urlData?.publicUrl

    if (!publicUrl) {
      // Rollback: remove uploaded file
      await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
      return NextResponse.json({ error: 'Failed to resolve file URL' }, { status: 500 })
    }

    // ─── Sanitize title ─────────────────────────────────────────────────
    const title =
      typeof titleRaw === 'string' && titleRaw.trim()
        ? titleRaw.trim().slice(0, MAX_TITLE_LEN)
        : cleanName.slice(0, MAX_TITLE_LEN)

    // ─── Insert metadata row ────────────────────────────────────────────
    const { data: doc, error: insertErr } = await supabase
      .from('project_documents')
      .insert({
        project_id: project.id,
        doc_type: docType,
        title,
        file_name: file.name.slice(0, MAX_FILENAME_LEN),
        file_url: publicUrl,
        file_path: path,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('[documents:POST] DB insert error:', insertErr)
      // Rollback: delete the file we just uploaded
      await supabase.storage.from(BUCKET).remove([path]).catch(() => {})

      if ((insertErr as any).code === '42P01') {
        return NextResponse.json(
          { error: 'Database schema is out of date. Run pending migrations (Phase 9.1).' },
          { status: 500 }
        )
      }
      throw insertErr
    }

    return NextResponse.json({ success: true, document: doc })
  } catch (error: any) {
    console.error('[documents:POST] Fatal:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to upload document' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE — remove a document (removes from storage + DB)
// Query param: ?id=<document_id>
// ═══════════════════════════════════════════════════════════════════════════

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const docId = searchParams.get('id')

  if (!docId) {
    return NextResponse.json({ error: 'Document id required' }, { status: 400 })
  }

  try {
    // ─── Verify ownership ───────────────────────────────────────────────
    const loaded = await loadOwnedProject(supabase, slug, user.id)
    if ('error' in loaded) return loaded.error
    const { project } = loaded

    // ─── Load doc + verify it belongs to this project ───────────────────
    const { data: doc, error: docErr } = await supabase
      .from('project_documents')
      .select('id, file_path, project_id')
      .eq('id', docId)
      .maybeSingle()

    if (docErr) throw docErr
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    if (doc.project_id !== project.id) {
      return NextResponse.json({ error: 'Document does not belong to this project' }, { status: 403 })
    }

    // ─── Delete from storage first ──────────────────────────────────────
    // If storage delete fails, we still try DB delete so the record isn't
    // orphaned; storage cleanup can be handled by a periodic job.
    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .remove([doc.file_path])

    if (storageErr) {
      // Log but continue — the file may already be gone
      console.warn('[documents:DELETE] Storage remove warning:', storageErr)
    }

    // ─── Delete DB row ──────────────────────────────────────────────────
    const { error: dbErr } = await supabase
      .from('project_documents')
      .delete()
      .eq('id', docId)

    if (dbErr) throw dbErr

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[documents:DELETE] Fatal:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete document' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PATCH — rename a document title
// Body: { id: string, title: string }
// ═══════════════════════════════════════════════════════════════════════════

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const docId = typeof body.id === 'string' ? body.id : null
  const rawTitle = typeof body.title === 'string' ? body.title : null

  if (!docId) {
    return NextResponse.json({ error: 'Document id required' }, { status: 400 })
  }
  if (!rawTitle || !rawTitle.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 })
  }

  try {
    const loaded = await loadOwnedProject(supabase, slug, user.id)
    if ('error' in loaded) return loaded.error
    const { project } = loaded

    const { data: existing, error: existingErr } = await supabase
      .from('project_documents')
      .select('id, project_id')
      .eq('id', docId)
      .maybeSingle()

    if (existingErr) throw existingErr
    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    if (existing.project_id !== project.id) {
      return NextResponse.json({ error: 'Document does not belong to this project' }, { status: 403 })
    }

    const title = rawTitle.trim().slice(0, MAX_TITLE_LEN)

    const { data: updated, error: updateErr } = await supabase
      .from('project_documents')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', docId)
      .select()
      .single()

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true, document: updated })
  } catch (error: any) {
    console.error('[documents:PATCH] Fatal:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update document' },
      { status: 500 }
    )
  }
}