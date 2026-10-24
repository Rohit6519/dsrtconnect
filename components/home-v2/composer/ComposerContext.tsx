'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface Publisher {
  type: 'person' | 'venture' | 'project' | 'community'
  id: string
  name: string
  handle: string
  avatar_url: string | null
  tagline?: string | null
  is_verified?: boolean
  role?: string
}

export interface MediaItem {
  id: string
  url: string
  kind: 'image' | 'video' | 'document'
  filename?: string
  size?: number
  mime_type?: string
}

export interface ComposerState {
  draftId: string | null
  publisher: Publisher | null
  postType: string
  title: string
  content: string
  contentBlocks: any[]
  media: MediaItem[]
  tags: string[]
  visibility: 'global' | 'followers' | 'connections' | 'private'
  commentsPermission: 'everyone' | 'followers' | 'connections' | 'none'
  scheduledAt: string | null
  isSensitive: boolean
  contentWarning: string

  setDraftId: (id: string | null) => void
  setPublisher: (p: Publisher | null) => void
  setPostType: (t: string) => void
  setTitle: (t: string) => void
  setContent: (c: string) => void
  setContentBlocks: (b: any[]) => void
  addMedia: (m: MediaItem) => void
  removeMedia: (id: string) => void
  addTag: (t: string) => void
  removeTag: (t: string) => void
  setVisibility: (v: any) => void
  setCommentsPermission: (v: any) => void
  setScheduledAt: (s: string | null) => void
  setIsSensitive: (b: boolean) => void
  setContentWarning: (s: string) => void
  reset: () => void
  serialize: () => any
}

const Ctx = createContext<ComposerState | null>(null)

export function ComposerProvider({ children }: { children: ReactNode }) {
  const [draftId, setDraftId] = useState<string | null>(null)
  const [publisher, setPublisher] = useState<Publisher | null>(null)
  const [postType, setPostType] = useState('update')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contentBlocks, setContentBlocks] = useState<any[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [visibility, setVisibility] = useState<any>('global')
  const [commentsPermission, setCommentsPermission] = useState<any>('everyone')
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)
  const [isSensitive, setIsSensitive] = useState(false)
  const [contentWarning, setContentWarning] = useState('')

  const addMedia = useCallback((m: MediaItem) => setMedia(prev => [...prev, m]), [])
  const removeMedia = useCallback((id: string) => setMedia(prev => prev.filter(m => m.id !== id)), [])

  const addTag = useCallback((t: string) => {
    const clean = t.trim().replace(/^#/, '').toLowerCase()
    if (!clean || clean.length > 100) return
    setTags(prev => (prev.includes(clean) ? prev : [...prev, clean]))
  }, [])

  const removeTag = useCallback((t: string) => setTags(prev => prev.filter(x => x !== t)), [])

  const reset = useCallback(() => {
    setDraftId(null)
    setPublisher(null)
    setPostType('update')
    setTitle('')
    setContent('')
    setContentBlocks([])
    setMedia([])
    setTags([])
    setVisibility('global')
    setCommentsPermission('everyone')
    setScheduledAt(null)
    setIsSensitive(false)
    setContentWarning('')
  }, [])

  const serialize = useCallback(() => {
    const images = media.filter(m => m.kind === 'image').map(m => m.url)
    const videos = media.filter(m => m.kind === 'video')
    const files = media.filter(m => m.kind === 'document')

    return {
      publisher_type: publisher?.type || 'person',
      publisher_id: publisher?.id,
      type: postType,
      title: title || null,
      content,
      content_text: content,
      content_blocks: contentBlocks || [],
      // Always send arrays — never null
      image_urls: images,
      media_urls: images,
      video_url: videos[0]?.url || null,
      file_urls: files.length
        ? files.map(f => ({
            url: f.url,
            filename: f.filename,
            size: f.size,
            mime_type: f.mime_type,
          }))
        : [],
      tags: tags || [],
      visibility,
      comments_permission: commentsPermission,
      scheduled_at: scheduledAt,
      is_sensitive: isSensitive,
      content_warning: contentWarning || null,
    }
  }, [
    publisher,
    postType,
    title,
    content,
    contentBlocks,
    media,
    tags,
    visibility,
    commentsPermission,
    scheduledAt,
    isSensitive,
    contentWarning,
  ])

  return (
    <Ctx.Provider
      value={{
        draftId,
        publisher,
        postType,
        title,
        content,
        contentBlocks,
        media,
        tags,
        visibility,
        commentsPermission,
        scheduledAt,
        isSensitive,
        contentWarning,
        setDraftId,
        setPublisher,
        setPostType,
        setTitle,
        setContent,
        setContentBlocks,
        addMedia,
        removeMedia,
        addTag,
        removeTag,
        setVisibility,
        setCommentsPermission,
        setScheduledAt,
        setIsSensitive,
        setContentWarning,
        reset,
        serialize,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useComposer() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useComposer must be used within ComposerProvider')
  return ctx
}