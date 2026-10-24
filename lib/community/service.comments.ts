// ============================================================
// lib/community/service.comments.ts
// Comments + reaction toggling.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import {
  writeAudit,
  writeOutbox,
  createKernelEvent,
  createNotification,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@/lib/kernel'
import { hasCommunityPermission, COMMUNITY_PERMISSIONS } from './permissions'
import { extractMentionCandidates, resolveMentions } from './mention-parser'

export type CommentTarget = 'post' | 'announcement' | 'comment'
export type ReactionTarget = 'post' | 'comment' | 'announcement'

const ALLOWED_REACTIONS = new Set(['like', 'celebrate', 'insightful', 'support'])

export async function createComment(
  supabase: SupabaseClient,
  actorId: string,
  input: {
    target_type: CommentTarget
    target_id: string
    parent_comment_id?: string | null
    body: string
  },
  requestId?: string
) {
  if (!input.body?.trim()) throw new ValidationError([{ field: 'body', message: 'Comment cannot be empty' }])
  if (input.body.length > 4000) throw new ValidationError([{ field: 'body', message: 'Comment too long' }])

  // Resolve target community
  let communityId: string | null = null
  let communitySlug: string | null = null
  let targetAuthorId: string | null = null

  if (input.target_type === 'post') {
    const { data: p } = await supabase
      .from('community_posts_v2')
      .select('community_id, author_identity_id, communities(slug)')
      .eq('id', input.target_id)
      .maybeSingle()
    if (!p) throw new NotFoundError('Post', input.target_id)
    communityId = p.community_id
    communitySlug = (p as any).communities?.slug
    targetAuthorId = p.author_identity_id
  } else if (input.target_type === 'announcement') {
    const { data: a } = await supabase
      .from('community_announcements')
      .select('community_id, author_identity_id, allow_comments, communities(slug)')
      .eq('id', input.target_id)
      .maybeSingle()
    if (!a) throw new NotFoundError('Announcement', input.target_id)
    if (!a.allow_comments) throw new ForbiddenError('Comments disabled on this announcement')
    communityId = a.community_id
    communitySlug = (a as any).communities?.slug
    targetAuthorId = a.author_identity_id
  } else if (input.target_type === 'comment') {
    const { data: c } = await supabase
      .from('community_comments')
      .select('community_id, author_identity_id, target_type')
      .eq('id', input.target_id)
      .maybeSingle()
    if (!c) throw new NotFoundError('Comment', input.target_id)
    if (c.parent_comment_id) throw new ValidationError([{ field: 'parent', message: 'Only one nesting level allowed' }])
    communityId = c.community_id
    targetAuthorId = c.author_identity_id
  }
  if (!communityId) throw new NotFoundError('Target')

  // Must be active member
  const { data: membership } = await supabase
    .from('community_memberships')
    .select('status')
    .eq('community_id', communityId)
    .eq('identity_id', actorId)
    .maybeSingle()
  if (!membership || membership.status !== 'ACTIVE') {
    throw new ForbiddenError('Only members can comment')
  }

  const { data: created, error } = await supabase
    .from('community_comments')
    .insert({
      community_id: communityId,
      target_type: input.target_type,
      target_id: input.target_id,
      parent_comment_id: input.parent_comment_id || null,
      author_identity_id: actorId,
      body: input.body.trim(),
    })
    .select('*')
    .single()
  if (error || !created) throw new Error(`Comment failed: ${error?.message}`)

  // Increment counters on parent post/comment
  if (input.target_type === 'post') {
    await supabase.rpc('rpc_increment', { p_table: 'community_posts_v2', p_id: input.target_id, p_field: 'comment_count', p_delta: 1 })
  } else if (input.target_type === 'comment') {
    await supabase.rpc('rpc_increment', { p_table: 'community_comments', p_id: input.target_id, p_field: 'reply_count', p_delta: 1 })
  }

  // Mentions
  const usernames = extractMentionCandidates(input.body)
  const mentioned = await resolveMentions(supabase, usernames)
  for (const u of mentioned) {
    if (u.id === actorId) continue
    await createNotification(supabase, {
      recipientId: u.id,
      type: 'community_comment_mention',
      priority: 'NORMAL',
      entityType: 'community_comment',
      entityId: created.id,
      title: 'You were mentioned in a comment',
      body: input.body.slice(0, 140),
      actionUrl: communitySlug ? `/community/${communitySlug}/discussion` : null,
      fromUserId: actorId,
      icon: 'message',
    })
  }

  // Notify parent author (except self)
  if (targetAuthorId && targetAuthorId !== actorId) {
    await createNotification(supabase, {
      recipientId: targetAuthorId,
      type: input.target_type === 'comment' ? 'community_comment_reply' : 'community_post_comment',
      priority: 'NORMAL',
      entityType: 'community_comment',
      entityId: created.id,
      title: input.target_type === 'comment' ? 'New reply to your comment' : 'New comment on your post',
      body: input.body.slice(0, 140),
      actionUrl: communitySlug ? `/community/${communitySlug}/discussion` : null,
      fromUserId: actorId,
      icon: 'message',
    })
  }

  await writeAudit(supabase, {
    actorId,
    action: 'community.comment.created',
    entityType: 'community_comment',
    entityId: created.id,
    scopeType: 'community',
    scopeId: communityId,
    requestId,
  })

  const event = createKernelEvent({
    eventType: 'community.comment.created',
    aggregateType: 'community_comment',
    aggregateId: created.id,
    actorId,
    payload: {
      community_id: communityId,
      target_type: input.target_type,
      target_id: input.target_id,
      comment_id: created.id,
    },
  })
  const eventId = await writeOutbox(supabase, event)

  return { comment_id: created.id, event_id: eventId }
}

export async function deleteComment(
  supabase: SupabaseClient,
  actorId: string,
  commentId: string,
  requestId?: string
) {
  const { data: c } = await supabase
    .from('community_comments')
    .select('*')
    .eq('id', commentId)
    .maybeSingle()
  if (!c) throw new NotFoundError('Comment', commentId)
  if (c.deleted_at) throw new ValidationError([{ field: 'status', message: 'Already deleted' }])

  const isAuthor = c.author_identity_id === actorId
  const canModerate = await hasCommunityPermission(
    supabase,
    actorId,
    c.community_id,
    COMMUNITY_PERMISSIONS.POST_MODERATE
  )
  if (!isAuthor && !canModerate) throw new ForbiddenError('Cannot delete')

  await supabase
    .from('community_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId)

  // Decrement parent counters
  if (c.target_type === 'post') {
    await supabase.rpc('rpc_increment', { p_table: 'community_posts_v2', p_id: c.target_id, p_field: 'comment_count', p_delta: -1 })
  } else if (c.target_type === 'comment') {
    await supabase.rpc('rpc_increment', { p_table: 'community_comments', p_id: c.target_id, p_field: 'reply_count', p_delta: -1 })
  }

  await writeAudit(supabase, {
    actorId,
    action: 'community.comment.deleted',
    entityType: 'community_comment',
    entityId: commentId,
    scopeType: 'community',
    scopeId: c.community_id,
    requestId,
  })
}

export async function toggleReaction(
  supabase: SupabaseClient,
  actorId: string,
  input: { target_type: ReactionTarget; target_id: string; reaction_type: string },
  requestId?: string
) {
  if (!ALLOWED_REACTIONS.has(input.reaction_type)) {
    throw new ValidationError([{ field: 'reaction_type', message: 'Invalid reaction type' }])
  }

  const { data, error } = await supabase.rpc('rpc_toggle_reaction', {
    p_target_type: input.target_type,
    p_target_id: input.target_id,
    p_identity_id: actorId,
    p_reaction_type: input.reaction_type,
  })
  if (error) throw new Error(error.message)

  return { action: (data as any)?.action || 'unknown' }
}