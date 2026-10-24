// ============================================================
// lib/coco/sdk/useCocoAutoWire.ts
// Reads the current pathname and auto-wires the correct adapter.
// This is the ONE hook that makes COCO work across every DSRT page.
// ============================================================

'use client'

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { useProjectAdapter } from './adapters/useProjectAdapter'
import { useVentureAdapter } from './adapters/useVentureAdapter'
import { useCommunityAdapter } from './adapters/useCommunityAdapter'
import { useProfileAdapter } from './adapters/useProfileAdapter'
import { useFeedAdapter } from './adapters/useFeedAdapter'
import { useOpportunityAdapter } from './adapters/useOpportunityAdapter'
import { useMailAdapter } from './adapters/useMailAdapter'
import { useInboxThreadAdapter } from './adapters/useInboxThreadAdapter'
import { setCocoContext } from './context-registry'
import { useEffect } from 'react'

interface DetectedRoute {
  kind:
    | 'home'
    | 'project'
    | 'venture'
    | 'community'
    | 'profile'
    | 'feed'
    | 'opportunity'
    | 'mail_inbox'
    | 'mail_thread'
    | 'unknown'
  params: Record<string, string>
}

function detectRoute(pathname: string): DetectedRoute {
  if (!pathname) return { kind: 'unknown', params: {} }

  // Home
  if (pathname === '/home' || pathname === '/') return { kind: 'home', params: {} }
  if (pathname === '/feed') return { kind: 'feed', params: {} }

  // Project
  let m = pathname.match(/^\/projects\/([^/]+)/)
  if (m) return { kind: 'project', params: { slug: m[1] } }

  // Venture
  m = pathname.match(/^\/ventures\/([^/]+)/)
  if (m) return { kind: 'venture', params: { slug: m[1] } }

  // Community
  m = pathname.match(/^\/community\/([^/]+)(?:\/([^/]+))?/)
  if (m) return { kind: 'community', params: { slug: m[1], tab: m[2] || 'overview' } }

  // Profile
  m = pathname.match(/^\/profile\/([^/]+)/)
  if (m) return { kind: 'profile', params: { username: m[1] } }

  // Opportunity
  m = pathname.match(/^\/looking-for\/([^/]+)/)
  if (m && m[1] !== 'create' && m[1] !== 'create-v2' && m[1] !== 'invitations')
    return { kind: 'opportunity', params: { id: m[1] } }

  // Mail
  m = pathname.match(/^\/inbox\/([^/]+)/)
  if (m) return { kind: 'mail_thread', params: { threadId: m[1] } }
  if (pathname.startsWith('/inbox')) return { kind: 'mail_inbox', params: {} }

  return { kind: 'unknown', params: {} }
}

export function useCocoAutoWire() {
  const pathname = usePathname() || '/'
  const detected: DetectedRoute = useMemo(() => detectRoute(pathname), [pathname])

  // Push page hint into COCO context registry
  useEffect(() => {
    const pageMap: Record<DetectedRoute['kind'], string> = {
      home: 'home',
      feed: 'feed',
      project: 'project',
      venture: 'venture',
      community: 'community',
      profile: 'profile',
      opportunity: 'opportunity',
      mail_inbox: 'mail_inbox',
      mail_thread: 'mail_thread',
      unknown: 'unknown',
    }

    const entityMap: Record<string, string | null> = {
      project: 'project',
      venture: 'venture',
      community: 'community',
      profile: 'user',
      opportunity: 'opportunity',
      mail_thread: 'mail_thread',
    }

    const idField: Record<string, string> = {
      project: 'slug',
      venture: 'slug',
      community: 'slug',
      profile: 'username',
      opportunity: 'id',
      mail_thread: 'threadId',
    }

    const entityType = entityMap[detected.kind]
    const idParam = idField[detected.kind]
    const entityId = idParam ? detected.params[idParam] : null

    setCocoContext({
      route: pathname,
      page: pageMap[detected.kind],
      entity: entityType && entityId ? { type: entityType, id: entityId } : undefined,
    })
  }, [pathname, detected])

  // Call the right adapter hook.
  // React rule: hooks must be called unconditionally, so we call all of them
  // but only pass real args to the one matching the current route.
  // Each adapter internally decides to no-op via `enabled` flag pattern
  // (handled via `useCocoComponent`'s `enabled` option).
  useProjectAdapter({ slug: detected.kind === 'project' ? detected.params.slug : '' })
  useVentureAdapter({ slug: detected.kind === 'venture' ? detected.params.slug : '' })
  useCommunityAdapter({
    slug: detected.kind === 'community' ? detected.params.slug : '',
    tab: detected.kind === 'community' ? detected.params.tab : undefined,
  })
  useProfileAdapter({ username: detected.kind === 'profile' ? detected.params.username : '' })
  useFeedAdapter()
  useOpportunityAdapter({ id: detected.kind === 'opportunity' ? detected.params.id : '' })
  useMailAdapter()
  useInboxThreadAdapter({
    threadId: detected.kind === 'mail_thread' ? detected.params.threadId : '',
  })
}