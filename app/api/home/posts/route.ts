import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function sanitizeHTML(html: string): string {
  if (!html) return ''
  return html
    .replace(/<\?xml[^>]*>/gi, '')
    .replace(/<\/?o:[^>]*>/gi, '')
    .replace(/<\/?w:[^>]*>/gi, '')
    .replace(/<\/?meta[^>]*>/gi, '')
    .replace(/<\/?link[^>]*>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s+style="[^"]*"/gi, '')
    .replace(/\s+style='[^']*'/gi, '')
    .replace(/\s+class="[^"]*"/gi, '')
    .replace(/\s+id="[^"]*"/gi, '')
    .replace(/\s+data-[a-z-]+="[^"]*"/gi, '')
    .replace(/\s+lang="[^"]*"/gi, '')
    .replace(/\s+xml:lang="[^"]*"/gi, '')
    .replace(/\s+dir="[^"]*"/gi, '')
    .replace(/<span[^>]*>/gi, '<span>')
    .replace(/<\/?font[^>]*>/gi, '')
    .replace(/\s+on\w+="[^"]*"/gi, '')
    .replace(/\s+on\w+='[^']*'/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function extractPlainText(html: string): string {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Coerce null/undefined/non-array into a real array */
function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value : []
}

/**
 * POST /api/home/posts
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  const {
    publisher_type = 'person',
    publisher_id,
    type = 'update',
    title,
    content,
    content_text,
    content_html,
    content_blocks,
    video_url,
    file_urls,
    link_url,
    link_title,
    link_description,
    link_image,
    visibility = 'global',
    event_date,
    event_end_date,
    event_location,
    is_online,
    registration_url,
    comments_permission = 'everyone',
    reposts_permission = true,
    quotes_permission = true,
    is_sensitive = false,
    content_warning,
    language_code = 'en',
    location,
    scheduled_at,
    is_draft = false,
    draft_id,
  } = body

  // FIX: null-safe arrays (defaults don't apply when client sends null)
  const media_urls = asArray<string>(body.media_urls)
  const image_urls = asArray<string>(body.image_urls)
  const tags = asArray<string>(body.tags)
  const blocks = asArray(content_blocks)
  const files = file_urls == null ? null : file_urls

  const rawHTML = content || content_text || ''
  const cleanHTML = sanitizeHTML(rawHTML)
  const plainText = extractPlainText(cleanHTML)

  const hasText = plainText.trim().length > 0
  const hasMedia = media_urls.length > 0 || image_urls.length > 0 || !!video_url
  if (!hasText && !hasMedia && !is_draft) {
    return NextResponse.json({ error: 'Post must have text or media' }, { status: 400 })
  }

  const effectivePublisherId = publisher_id || user.id

  const { data: canPublish, error: permErr } = await supabase.rpc('fn_can_publish_as', {
    p_user_id: user.id,
    p_publisher_type: publisher_type,
    p_publisher_id: effectivePublisherId,
  })

  if (permErr) console.error('Permission check error:', permErr)
  if (!canPublish) {
    return NextResponse.json({
      error: 'You do not have permission to publish as this identity',
    }, { status: 403 })
  }

  try {
    const insertData: any = {
      user_id: user.id,
      publisher_type,
      publisher_id: effectivePublisherId,
      type,
      title: title?.trim() || null,
      content: cleanHTML || '',
      content_text: plainText || '',
      content_html: cleanHTML || null,
      content_blocks: blocks,
      media_urls: media_urls.length ? media_urls : null,
      image_urls: image_urls.length ? image_urls : null,
      video_url: video_url || null,
      file_urls: files,
      link_url: link_url || null,
      link_title: link_title || null,
      link_description: link_description || null,
      link_image: link_image || null,
      tags: tags.length ? tags : null,
      visibility,
      event_date: event_date || null,
      event_end_date: event_end_date || null,
      event_location: event_location || null,
      is_online: is_online || null,
      registration_url: registration_url || null,
      comments_permission,
      reposts_permission,
      quotes_permission,
      is_sensitive,
      content_warning: content_warning || null,
      language_code,
      location: location || null,
      scheduled_at: scheduled_at || null,
      is_draft,
      is_published_at: (is_draft || scheduled_at) ? null : new Date().toISOString(),
    }

    if (publisher_type === 'venture') {
      insertData.venture_id = effectivePublisherId
    } else if (publisher_type === 'project') {
      insertData.project_id = effectivePublisherId
    }

    let post: any
    if (draft_id) {
      const { data: updated } = await supabase
        .from('posts')
        .select('id, user_id')
        .eq('id', draft_id)
        .single()

      if (!updated || updated.user_id !== user.id) {
        return NextResponse.json({ error: 'Draft not found or not owned by you' }, { status: 403 })
      }

      const { data, error } = await supabase
        .from('posts')
        .update(insertData)
        .eq('id', draft_id)
        .select()
        .single()

      if (error) throw error
      post = data
    } else {
      const { data, error } = await supabase
        .from('posts')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error
      post = data
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (e: any) {
    console.error('Create post error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}