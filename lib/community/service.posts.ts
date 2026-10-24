// ============================================================
// lib/community/service.posts.ts
// Post lifecycle service.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import {
  writeAudit,
  writeOutbox,
  createKernelEvent,
  createNotification,
  KERNEL_EVENT_TYPES,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@/lib/kernel'
import { extractMentionCandidates, resolveMentions, extractHashtags } from './mention-parser'
import { hasCommunityPermission, COMMUNITY_PERMISSIONS } from './permissions'

export interface CreatePostInput {
  community_id: string
  post_type?: 'TEXT' | 'LINK' | 'IMAGE' | 'POLL' | 'QUESTION'
  title?: string
  body?: string
  visibility?: 'PUBLIC' | 'MEMBERS'
  link_url?: string
  attachments?: Array<{ file_id?: string; url?: string; attachment_type?: string; caption?: string }>
  poll?: {
    question: string
    options: string[]
    multiple_choice?: boolean
    anonymous?: boolean
    allow_change_vote?: boolean
    ends_at?: string
  }
}

export async function createPost(
  supabase: SupabaseClient,
  actorId: string,
  input: CreatePostInput,
  requestId?: string
): Promise<{ post_id: string; event_id: string }> {
  const canPost = await hasCommunityPermission(
    supabase,
    actorId,
    input.community_id,
    COMMUNITY_PERMISSIONS.POST_CREATE
  )
  if (!canPost) throw new ForbiddenError('You cannot post in this community')

  // Basic validation
  if (!input.body && !input.title && (!input.attachments || input.attachments.length === 0) && !input.poll) {
    throw new ValidationError([{ field: 'body', message: 'Post cannot be empty' }])
  }
  if (input.body && input.body.length > 10000) {
    throw new ValidationError([{ field: 'body', message: 'Post body too long (max 10,000 chars)' }])
  }

  const { data: community } = await supabase
    .from('communities')
    .select('id, name, slug, owner_identity_id')
    .eq('id', input.community_id)
    .maybeSingle()
  if (!community) throw new NotFoundError('Community', input.community_id)

  // Insert post
  const { data: post, error } = await supabase
    .from('community_posts_v2')
    .insert({
      community_id: input.community_id,
      author_identity_id: actorId,
      post_type: input.post_type ?? 'TEXT',
      title: input.title?.trim() || null,
      body: input.body?.trim() || null,
      visibility: input.visibility ?? 'MEMBERS',
      link_url: input.link_url || null,
      status: 'PUBLISHED',
    })
    .select('*')
    .single()

  if (error || !post) throw new Error(`Failed to create post: ${error?.message}`)

  // Attachments
  if (input.attachments && input.attachments.length > 0) {
    const rows = input.attachments.map((a, i) => ({
      post_id: post.id,
      file_id: a.file_id || null,
      url: a.url || null,
      attachment_type: a.attachment_type || 'IMAGE',
      caption: a.caption || null,
      position: i,
    }))
    await supabase.from('community_post_attachments').insert(rows)
  }

  // Poll
  if (input.poll && input.poll.options.length >= 2) {
    const { data: poll } = await supabase
      .from('community_polls_v2')
      .insert({
        community_id: input.community_id,
        post_id: post.id,
        author_identity_id: actorId,
        question: input.poll.question,
        multiple_choice: !!input.poll.multiple_choice,
        anonymous: !!input.poll.anonymous,
        allow_change_vote: input.poll.allow_change_vote !== false,
        ends_at: input.poll.ends_at || null,
        status: 'OPEN',
      })
      .select('id')
      .single()

    if (poll) {
      const opts = input.poll.options
        .filter((o) => o.trim())
        .map((o, i) => ({ poll_id: poll.id, label: o.trim().slice(0, 200), position: i }))
      await supabase.from('community_poll_options').insert(opts)
      await supabase.from('community_posts_v2').update({ poll_id: poll.id, post_type: 'POLL' }).eq('id', post.id)
    }
  }

  // Mentions
  const bodyText = `${input.title || ''} ${input.body || ''}`
  const usernames = extractMentionCandidates(bodyText)
  const mentioned = await resolveMentions(supabase, usernames)
  if (mentioned.length > 0) {
    await supabase.from('community_post_mentions').insert(
      mentioned.map((u) => ({ post_id: post.id, mentioned_identity_id: u.id }))
    )
    // Notify each mentioned user (except author)
    for (const u of mentioned) {
      if (u.id === actorId) continue
      await createNotification(supabase, {
        recipientId: u.id,
        type: 'community_post_mention',
        priority: 'NORMAL',
        entityType: 'community_post',
        entityId: post.id,
        title: `You were mentioned in ${community.name}`,
        body: (input.body || input.title || '').slice(0, 140),
        actionUrl: `/community/${community.slug}/discussion`,
        fromUserId: actorId,
        icon: 'message',
      })
    }
  }

  // Hashtags
  const tags = extractHashtags(bodyText)
  if (tags.length > 0) {
    await supabase.from('community_post_tags').insert(
      tags.slice(0, 10).map((t) => ({ post_id: post.id, tag: t }))
    )
  }

  await writeAudit(supabase, {
    actorId,
    action: 'community.post.created',
    entityType: 'community_post',
    entityId: post.id,
    scopeType: 'community',
    scopeId: input.community_id,
    requestId,
    after: { post_type: post.post_type, visibility: post.visibility },
  })

  const event = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.POST_PUBLISHED,
    aggregateType: 'community_post',
    aggregateId: post.id,
    actorId,
    payload: {
      community_id: input.community_id,
      community_slug: community.slug,
      post_id: post.id,
      post_type: post.post_type,
    },
  })
  const eventId = await writeOutbox(supabase, event)

  return { post_id: post.id, event_id: eventId }
}

export async function deletePost(
  supabase: SupabaseClient,
  actorId: string,
  postId: string,
  requestId?: string
): Promise<{ event_id: string }> {
  const { data: post } = await supabase
    .from('community_posts_v2')
    .select('*, communities(id, slug)')
    .eq('id', postId)
    .maybeSingle()
  if (!post) throw new NotFoundError('Post', postId)
  if (post.deleted_at) throw new ValidationError([{ field: 'status', message: 'Already deleted' }])

  const isAuthor = post.author_identity_id === actorId
  const canModerate = await hasCommunityPermission(
    supabase,
    actorId,
    post.community_id,
    COMMUNITY_PERMISSIONS.POST_MODERATE
  )

  if (!isAuthor && !canModerate) throw new ForbiddenError('Cannot delete this post')

  await supabase
    .from('community_posts_v2')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: actorId,
      status: 'REMOVED',
    })
    .eq('id', postId)

  await writeAudit(supabase, {
    actorId,
    action: 'community.post.deleted',
    entityType: 'community_post',
    entityId: postId,
    scopeType: 'community',
    scopeId: post.community_id,
    requestId,
    before: { status: post.status },
    after: { status: 'REMOVED' },
  })

  const event = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.POST_REMOVED,
    aggregateType: 'community_post',
    aggregateId: postId,
    actorId,
    payload: { community_id: post.community_id, post_id: postId, deleted_by_moderator: !isAuthor },
  })
  const eventId = await writeOutbox(supabase, event)

  return { event_id: eventId }
}

export async function pinPost(
  supabase: SupabaseClient,
  actorId: string,
  postId: string,
  pin: boolean,
  requestId?: string
) {
  const { data: post } = await supabase
    .from('community_posts_v2')
    .select('id, community_id')
    .eq('id', postId)
    .maybeSingle()
  if (!post) throw new NotFoundError('Post', postId)

  const canPin = await hasCommunityPermission(
    supabase,
    actorId,
    post.community_id,
    COMMUNITY_PERMISSIONS.ANNOUNCEMENT_PIN
  )
  if (!canPin) throw new ForbiddenError('Cannot pin posts')

  await supabase
    .from('community_posts_v2')
    .update({
      pinned_at: pin ? new Date().toISOString() : null,
      pinned_by: pin ? actorId : null,
    })
    .eq('id', postId)

  await writeAudit(supabase, {
    actorId,
    action: pin ? 'community.post.pinned' : 'community.post.unpinned',
    entityType: 'community_post',
    entityId: postId,
    scopeType: 'community',
    scopeId: post.community_id,
    requestId,
  })
}