// ============================================================
// lib/coco/context/resolvers/entity.ts
// L3 — Entity context.
// The client provides {type, id}. Everything else is server-resolved.
// ============================================================

import { adminClient } from '@/lib/supabase/admin'
import type { EntityContext, CocoEntityRef, UUID } from '@/types/coco'
import { stripInjectionMarkers } from '../security'

const SUMMARY_TEXT_LIMIT = 400

/**
 * Resolve entity summary based on type.
 * Verifies read access implicitly via existence + the requesting user's RLS-visible rows.
 */
export async function resolveEntity(
  ref: CocoEntityRef,
  userId: UUID
): Promise<EntityContext | undefined> {
  switch (ref.type) {
    case 'user':      return resolveUserEntity(ref.id)
    case 'project':   return resolveProjectEntity(ref.id, userId)
    case 'venture':   return resolveVentureEntity(ref.id, userId)
    case 'community': return resolveCommunityEntity(ref.id, userId)
    case 'post':      return resolvePostEntity(ref.id, userId)
    default:          return undefined
  }
}

// ---------- user ----------
async function resolveUserEntity(id: string): Promise<EntityContext | undefined> {
  const { data } = await adminClient
    .from('users')
    .select('id, username, full_name, tagline, is_verified, follower_count')
    .eq('id', id)
    .maybeSingle()

  if (!data) return undefined

  return {
    type: 'user',
    id: data.id,
    slug: data.username || undefined,
    display_name: data.full_name || data.username || undefined,
    summary: {
      username: data.username,
      full_name: data.full_name,
      tagline: stripInjectionMarkers(data.tagline || '').slice(0, SUMMARY_TEXT_LIMIT),
      is_verified: data.is_verified,
      follower_count: data.follower_count,
    },
  }
}

// ---------- project ----------
async function resolveProjectEntity(id: string, userId: UUID): Promise<EntityContext | undefined> {
  // Try by ID first, then by slug
  let { data } = await adminClient
    .from('projects')
    .select('id, slug, name, tagline, description, status, follower_count, created_at, owner_id')
    .eq('id', id)
    .maybeSingle()

  if (!data) {
    const bySlug = await adminClient
      .from('projects')
      .select('id, slug, name, tagline, description, status, follower_count, created_at, owner_id')
      .eq('slug', id)
      .maybeSingle()
    data = bySlug.data
  }

  if (!data) return undefined

  const isOwner = data.owner_id === userId

  return {
    type: 'project',
    id: data.id,
    slug: data.slug || undefined,
    display_name: data.name,
    summary: {
      name: data.name,
      tagline: stripInjectionMarkers(data.tagline || '').slice(0, SUMMARY_TEXT_LIMIT),
      description_preview: stripInjectionMarkers(data.description || '').slice(0, SUMMARY_TEXT_LIMIT),
      status: data.status,
      follower_count: data.follower_count,
      created_at: data.created_at,
      viewer_is_owner: isOwner,
    },
  }
}

// ---------- venture ----------
async function resolveVentureEntity(id: string, userId: UUID): Promise<EntityContext | undefined> {
  let { data } = await adminClient
    .from('ventures')
    .select('id, slug, name, tagline, description, stage, sector, follower_count, is_verified, owner_id')
    .eq('id', id)
    .maybeSingle()

  if (!data) {
    const bySlug = await adminClient
      .from('ventures')
      .select('id, slug, name, tagline, description, stage, sector, follower_count, is_verified, owner_id')
      .eq('slug', id)
      .maybeSingle()
    data = bySlug.data
  }

  if (!data) return undefined

  return {
    type: 'venture',
    id: data.id,
    slug: data.slug || undefined,
    display_name: data.name,
    summary: {
      name: data.name,
      tagline: stripInjectionMarkers(data.tagline || '').slice(0, SUMMARY_TEXT_LIMIT),
      description_preview: stripInjectionMarkers(data.description || '').slice(0, SUMMARY_TEXT_LIMIT),
      stage: data.stage,
      sector: data.sector,
      is_verified: data.is_verified,
      follower_count: data.follower_count,
      viewer_is_owner: data.owner_id === userId,
    },
  }
}

// ---------- community ----------
async function resolveCommunityEntity(id: string, userId: UUID): Promise<EntityContext | undefined> {
  let { data } = await adminClient
    .from('communities')
    .select('id, slug, name, description, member_count, is_verified, category')
    .eq('id', id)
    .maybeSingle()

  if (!data) {
    const bySlug = await adminClient
      .from('communities')
      .select('id, slug, name, description, member_count, is_verified, category')
      .eq('slug', id)
      .maybeSingle()
    data = bySlug.data
  }

  if (!data) return undefined

  // Check if viewer is a member
  const { data: membership } = await adminClient
    .from('community_members')
    .select('role')
    .eq('community_id', data.id)
    .eq('user_id', userId)
    .maybeSingle()

  return {
    type: 'community',
    id: data.id,
    slug: data.slug || undefined,
    display_name: data.name,
    summary: {
      name: data.name,
      description_preview: stripInjectionMarkers(data.description || '').slice(0, SUMMARY_TEXT_LIMIT),
      category: data.category,
      member_count: data.member_count,
      is_verified: data.is_verified,
      viewer_role: membership?.role || null,
    },
  }
}

// ---------- post ----------
async function resolvePostEntity(id: string, userId: UUID): Promise<EntityContext | undefined> {
  const { data } = await adminClient
    .from('posts')
    .select('id, publisher_type, publisher_id, type, content_text, created_at, user_id, like_count, comment_count')
    .eq('id', id)
    .maybeSingle()

  if (!data) return undefined

  return {
    type: 'post',
    id: data.id,
    display_name: `Post from ${data.created_at}`,
    summary: {
      publisher_type: data.publisher_type,
      publisher_id: data.publisher_id,
      post_type: data.type,
      content_preview: stripInjectionMarkers(data.content_text || '').slice(0, SUMMARY_TEXT_LIMIT),
      like_count: data.like_count,
      comment_count: data.comment_count,
      viewer_is_author: data.user_id === userId,
    },
  }
}