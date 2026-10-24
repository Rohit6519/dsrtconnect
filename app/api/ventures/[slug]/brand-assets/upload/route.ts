import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/ventures/[slug]/brand-assets/upload
 * Body: { kind: 'logo' | 'cover', mime_type: string, file_size: number }
 * Returns: { upload_url, storage_path, public_url }
 *
 * Client uploads directly to Supabase Storage using the signed URL.
 * This bypasses Next.js API body limits (default 4MB) — essential for banners.
 */

const MAX_LOGO_SIZE = 5 * 1024 * 1024   // 5 MB
const MAX_COVER_SIZE = 15 * 1024 * 1024 // 15 MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase
    .from('ventures')
    .select('id, user_id, founder_id')
    .eq('slug', slug)
    .maybeSingle()

  if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

  const isOwner = await supabase.rpc('is_venture_owner_or_member', {
    p_venture_id: venture.id,
    p_user_id: user.id
  })

  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const kind: 'logo' | 'cover' = body.kind
    const mimeType: string = body.mime_type
    const fileSize: number = body.file_size

    // ─── Validation ───
    if (!['logo', 'cover'].includes(kind)) {
      return NextResponse.json({ error: 'Invalid asset kind' }, { status: 400 })
    }
    if (!ALLOWED_MIMES.includes(mimeType)) {
      return NextResponse.json({ error: `Unsupported file type: ${mimeType}` }, { status: 400 })
    }
    const maxSize = kind === 'logo' ? MAX_LOGO_SIZE : MAX_COVER_SIZE
    if (fileSize > maxSize) {
      return NextResponse.json({
        error: `File too large. Max ${maxSize / (1024 * 1024)}MB for ${kind}`
      }, { status: 400 })
    }

    // ─── Generate signed upload URL ───
    const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1]
    const storagePath = `${venture.id}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`

    const { data: signed, error: signErr } = await supabase.storage
      .from('ventures')
      .createSignedUploadUrl(storagePath)

    if (signErr || !signed) {
      console.error('Sign URL error:', signErr)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('ventures')
      .getPublicUrl(storagePath)

    return NextResponse.json({
      upload_url: signed.signedUrl,
      upload_token: signed.token,
      storage_path: storagePath,
      public_url: publicUrl,
    })
  } catch (e: any) {
    console.error('Upload URL error:', e)
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}