import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const kind = (formData.get('kind') as string) || 'image'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const MAX_SIZE_MB = kind === 'video' ? 100 : kind === 'document' ? 25 : 15
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File exceeds ' + MAX_SIZE_MB + 'MB limit' },
        { status: 413 }
      )
    }

    const ext = file.name.split('.').pop() || 'bin'
    const path =
      user.id +
      '/' +
      kind +
      '/' +
      Date.now() +
      '-' +
      Math.random().toString(36).slice(2, 10) +
      '.' +
      ext

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const buckets = ['post-media', 'public-media', 'venture-media']
    let uploadedUrl: string | null = null
    let usedBucket = ''

    for (const bucket of buckets) {
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        })

      if (!upErr) {
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(path)
        uploadedUrl = urlData.publicUrl
        usedBucket = bucket
        break
      }
    }

    if (!uploadedUrl) {
      return NextResponse.json(
        {
          error:
            'Upload failed. Create a "post-media" bucket in Supabase Dashboard.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: uploadedUrl,
      path: path,
      bucket: usedBucket,
      kind: kind,
      size: file.size,
      filename: file.name,
      mime_type: file.type,
    })
  } catch (e: any) {
    console.error('Upload error:', e)
    return NextResponse.json(
      { error: e?.message || 'Upload failed' },
      { status: 500 }
    )
  }
}