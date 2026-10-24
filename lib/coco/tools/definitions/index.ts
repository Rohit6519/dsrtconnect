// ============================================================
// lib/coco/tools/definitions/index.ts
// ============================================================

import { adminClient } from '@/lib/supabase/admin'
import type { UUID } from '@/types/coco'

export type ToolHandler = (args: Record<string, unknown>, userId: UUID) => Promise<unknown>

function resolveRoute(input: string): string {
  const raw = String(input || '').trim()
  if (!raw) return '/home'
  if (raw.startsWith('/')) return raw
  const s = raw.toLowerCase().replace(/[_-]+/g, ' ').trim()
  const table: Array<{ keys: string[]; route: string }> = [
    { keys: ['home', 'feed', 'main'], route: '/home' },
    { keys: ['project section', 'projects', 'my project', 'my projects', 'project'], route: '/projects' },
    { keys: ['create project', 'new project'], route: '/projects/new' },
    { keys: ['venture', 'ventures', 'my venture', 'my ventures'], route: '/ventures' },
    { keys: ['new venture', 'create venture'], route: '/ventures/new' },
    { keys: ['looking for', 'opportunities', 'jobs', 'hiring'], route: '/looking-for' },
    { keys: ['mail', 'inbox', 'dsrt mail', 'email'], route: '/inbox' },
    { keys: ['messages', 'dm', 'chat'], route: '/messages' },
    { keys: ['community', 'communities'], route: '/community' },
    { keys: ['my communities'], route: '/my-communities' },
    { keys: ['network', 'my network'], route: '/my-network' },
    { keys: ['notifications'], route: '/notifications' },
    { keys: ['profile', 'my profile'], route: '/profile/me' },
    { keys: ['settings'], route: '/settings' },
    { keys: ['explore'], route: '/explore' },
    { keys: ['resources'], route: '/resources' },
    { keys: ['events'], route: '/events' },
    { keys: ['saved'], route: '/saved' },
    { keys: ['pulse'], route: '/pulse' },
    { keys: ['vault'], route: '/vault' },
  ]
  for (const row of table) for (const k of row.keys) if (s === k || s.includes(k)) return row.route
  const slug = s.replace(/\s+/g, '-')
  return slug.length > 0 ? `/${slug}` : '/home'
}

export const toolHandlers: Record<string, ToolHandler> = {
  'navigate.to': async (args) => {
    const route = resolveRoute(String(args.route ?? args.destination ?? args.path ?? ''))
    return { success: true, action: 'client_navigate', route, message: `Navigating to ${route}` }
  },

  get_current_page: async () => ({
    success: true,
    message: 'Current page context is supplied in the system envelope',
  }),

  'ui.act': async (args) => {
    const component_id = String(args.component_id || '')
    const action = String(args.action || '')
    const payload = (args.payload && typeof args.payload === 'object') ? args.payload : {}
    if (!component_id || !action) throw new Error('ui.act requires component_id and action')
    return { success: true, action: 'client_component_act', component_id, component_action: action, payload }
  },

  'ui.get_state': async (args) => {
    const component_id = String(args.component_id || '')
    if (!component_id) throw new Error('ui.get_state requires component_id')
    return { success: true, action: 'client_component_get_state', component_id }
  },

  'search.projects': async (args) => {
    const query = String(args.query || '')
    const limit = Math.min(Number(args.limit || 5), 10)
    const { data } = await adminClient.from('projects').select('id, slug, name, tagline, status, follower_count').or(`name.ilike.%${query}%,tagline.ilike.%${query}%`).limit(limit)
    return { projects: data || [] }
  },

  'search.users': async (args) => {
    const query = String(args.query || '').replace(/^@/, '')
    const limit = Math.min(Number(args.limit || 5), 10)
    const { data } = await adminClient.from('users').select('id, username, full_name, tagline, is_verified, avatar_url').or(`username.ilike.%${query}%,full_name.ilike.%${query}%`).limit(limit)
    return { users: data || [] }
  },

  'search.ventures': async (args) => {
    const query = String(args.query || '')
    const limit = Math.min(Number(args.limit || 5), 10)
    const { data } = await adminClient.from('ventures').select('id, slug, name, tagline, stage, sector').or(`name.ilike.%${query}%,tagline.ilike.%${query}%`).limit(limit)
    return { ventures: data || [] }
  },

  'search.communities': async (args) => {
    const query = String(args.query || '')
    const limit = Math.min(Number(args.limit || 5), 10)
    const { data } = await adminClient.from('communities').select('id, slug, name, description, member_count').or(`name.ilike.%${query}%,description.ilike.%${query}%`).limit(limit)
    return { communities: data || [] }
  },

  'get.project': async (args) => {
    const id = String(args.project_id)
    const { data } = await adminClient.from('projects').select('id, slug, name, tagline, description, status, follower_count, owner_id, created_at').or(`id.eq.${id},slug.eq.${id}`).maybeSingle()
    return { project: data }
  },

  'get.venture': async (args) => {
    const id = String(args.venture_id)
    const { data } = await adminClient.from('ventures').select('id, slug, name, tagline, description, stage, sector, follower_count, owner_id').or(`id.eq.${id},slug.eq.${id}`).maybeSingle()
    return { venture: data }
  },

  'get.user': async (args) => {
    const id = String(args.username_or_id).replace(/^@/, '')
    const { data } = await adminClient.from('users').select('id, username, full_name, tagline, avatar_url, is_verified, follower_count').or(`id.eq.${id},username.eq.${id}`).maybeSingle()
    return { user: data }
  },

  'get.my_projects': async (_args, userId) => {
    const { data } = await adminClient.from('projects').select('id, slug, name, tagline, status').eq('owner_id', userId).limit(20)
    return { projects: data || [] }
  },

  'get.my_ventures': async (_args, userId) => {
    const { data } = await adminClient.from('ventures').select('id, slug, name, tagline, stage').eq('owner_id', userId).limit(20)
    return { ventures: data || [] }
  },

  'ui.fill_field': async (args) => ({ success: true, action: 'client_ui_fill', field_id: String(args.field_id), value: String(args.value) }),
  'ui.select_option': async (args) => ({ success: true, action: 'client_ui_select', component_id: String(args.component_id), option_key: String(args.option_key) }),
  'mail.open': async (args) => {
    const threadId = args.thread_id ? String(args.thread_id) : undefined
    const route = threadId ? `/inbox/${threadId}` : '/inbox'
    return { success: true, action: 'client_navigate', route }
  },
  'mail.compose_and_focus': async () => ({ success: true, action: 'client_mail_compose' }),
  'mail.fill_recipient': async (args) => ({ success: true, action: 'client_mail_fill_recipient', recipient: String(args.recipient) }),
  'mail.fill_subject': async (args) => ({ success: true, action: 'client_mail_fill_subject', subject: String(args.subject) }),
  'mail.fill_body': async (args) => ({ success: true, action: 'client_mail_fill_body', body: String(args.body) }),

  'identity.ask_context': async (args, userId) => {
    const [projRes, ventRes, userRes] = await Promise.all([
      adminClient.from('projects').select('id, slug, name').eq('owner_id', userId).limit(10),
      adminClient.from('ventures').select('id, slug, name').eq('owner_id', userId).limit(10),
      adminClient.from('users').select('username, full_name').eq('id', userId).maybeSingle(),
    ])
    const options: Array<{ id: string; label: string; type: string }> = []
    if (userRes.data) options.push({ id: `user:${userId}`, label: `Personally as @${userRes.data.username}`, type: 'user' })
    for (const p of projRes.data || []) options.push({ id: `project:${p.id}`, label: `As my project "${p.name}"`, type: 'project' })
    for (const v of ventRes.data || []) options.push({ id: `venture:${v.id}`, label: `As my venture "${v.name}"`, type: 'venture' })
    return {
      question: `${args.purpose || 'How would you like to send this'}${args.target ? ` to ${args.target}` : ''}, Sir?`,
      options,
    }
  },

  'workflow.plan': async (args) => ({ acknowledged: true, plan_shown: true, steps: args.steps, summary: args.summary }),

  'mail.create_draft': async (args, userId) => {
    const recipient = String(args.recipient_email_or_username).replace(/^@/, '')
    const subject = String(args.subject)
    const body = String(args.body)
    const { data, error } = await adminClient.from('posts').insert({
      user_id: userId, publisher_type: 'person', publisher_id: userId, type: 'text',
      title: subject, content_text: body, visibility: 'private', is_draft: true,
      metadata: { draft_recipient: recipient, is_mail_draft: true },
    }).select('id').single()
    if (error) throw new Error(`Failed to create mail draft: ${error.message}`)
    return { draft_id: data.id, created: true, recipient, subject }
  },

  // ────────────────────────────────────────────────────────────
  // MEMORY (Phase 15)
  // ────────────────────────────────────────────────────────────
  'memory.remember': async (args, userId) => {
    const key = String(args.key).toLowerCase().replace(/[^a-z0-9_]/g, '_')
    const value = String(args.value)
    
    const { error } = await adminClient
      .from('coco_memory')
      .upsert(
        { 
          user_id: userId, 
          type: 'explicit', 
          key, 
          value, 
          source: 'explicit_user_statement', 
          confidence: 1.0,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id, type, key' }
      )

    if (error) throw new Error(`Failed to save memory: ${error.message}`)
    return { success: true, message: `Memorized: ${key} = ${value}` }
  },

  'memory.forget': async (args, userId) => {
    const key = String(args.key).toLowerCase().replace(/[^a-z0-9_]/g, '_')
    
    const { error } = await adminClient
      .from('coco_memory')
      .delete()
      .eq('user_id', userId)
      .eq('key', key)

    if (error) throw new Error(`Failed to delete memory: ${error.message}`)
    return { success: true, message: `Forgot: ${key}` }
  }
}