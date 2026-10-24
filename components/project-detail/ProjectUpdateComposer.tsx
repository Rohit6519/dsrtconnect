'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import {
  // Update types (solid, professional)
  ChatCircleDots, Package, Wrench, Flask, ChartLine, Bug, Megaphone, UsersThree, Notepad,
  // Media / actions
  Image as ImageIcon, VideoCamera, LinkSimple, Tag, Plus, Trash, X, Check,
  CaretUp, CaretDown, DotsSixVertical, FloppyDisk, PaperPlaneRight,
  CircleNotch, Warning, ArrowClockwise, Prohibit,
  CaretDown as CaretDownIcon, CaretLeft, CaretRight, Crop, TextT, UploadSimple
} from '@phosphor-icons/react'

import { ImageCropperModal } from './ImageCropperModal'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  slug: string
  currentStage?: string
  onClose: () => void
  onPosted: () => void
  onUploadImage: (file: File, kind: 'update') => Promise<string | null>
  onUploadAttachment?: (file: File) => Promise<any>
}

interface ImageObj {
  url: string
  alt?: string
}

interface Section {
  id: string
  text: string
  images: ImageObj[]
  video: string | null
}

interface UpdateLink {
  id: string
  title: string
  url: string
}

interface DraftState {
  update_type: string
  title: string
  sections: Section[]
  links: UpdateLink[]
  tags: string[]
  release_label: 'none' | 'pre-release' | 'release'
  comments_disabled: boolean
  savedAt: number
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const UPDATE_TYPES = [
  { id: 'general',       label: 'General',       icon: ChatCircleDots, color: 'text-white/70'   },
  { id: 'release',       label: 'Release',       icon: Package,        color: 'text-white'       },
  { id: 'building',      label: 'Building',      icon: Wrench,         color: 'text-white/85'   },
  { id: 'experiment',    label: 'Experiment',    icon: Flask,          color: 'text-white/85'   },
  { id: 'progress',      label: 'Progress',      icon: ChartLine,      color: 'text-white/85'   },
  { id: 'fix',           label: 'Fix',           icon: Bug,            color: 'text-white/85'   },
  { id: 'announcement',  label: 'Announcement',  icon: Megaphone,      color: 'text-white/85'   },
  { id: 'collaboration', label: 'Collaboration', icon: UsersThree,     color: 'text-white/85'   },
  { id: 'insight',       label: 'Insight',       icon: Notepad,        color: 'text-white/85'   },
]

const MAX_IMAGES_TOTAL = 4
const MAX_VIDEOS_TOTAL = 1
const MAX_LINKS = 8
const MAX_TAGS = 10
const MAX_SECTIONS = 8
const MAX_TITLE = 200
const MAX_SECTION_TEXT = 10000
const MAX_LINK_TITLE = 60
const MAX_LINK_URL = 500
const MAX_TAG_LENGTH = 40
const MAX_VIDEO_SIZE_MB = 50
const AUTOSAVE_DEBOUNCE_MS = 1500
const DRAFT_STORAGE_KEY = 'dsrt-project-update-draft'

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

const uid = () => Math.random().toString(36).slice(2, 11)

const makeEmptySection = (): Section => ({
  id: uid(),
  text: '',
  images: [],
  video: null,
})

const countImages = (sections: Section[]) =>
  sections.reduce((n, s) => n + s.images.length, 0)

const countVideos = (sections: Section[]) =>
  sections.reduce((n, s) => n + (s.video ? 1 : 0), 0)

const isValidUrl = (u: string) => /^https?:\/\/.+/.test(u.trim()) || /^mailto:/.test(u.trim())

const storageKey = (slug: string) => `${DRAFT_STORAGE_KEY}:${slug}`

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ProjectUpdateComposer({
  slug,
  currentStage,
  onClose,
  onPosted,
  onUploadImage,
  onUploadAttachment,
}: Props) {
  // ─── State ────────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false)
  const [posting, setPosting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const [updateType, setUpdateType] = useState('general')
  const [title, setTitle] = useState('')
  const [sections, setSections] = useState<Section[]>(() => [makeEmptySection()])
  const [links, setLinks] = useState<UpdateLink[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [releaseLabel, setReleaseLabel] = useState<'none' | 'pre-release' | 'release'>('none')
  const [commentsDisabled, setCommentsDisabled] = useState(false)

  // ─── Upload state (per section) ───────────────────────────────────────
  const [uploadingSectionId, setUploadingSectionId] = useState<string | null>(null)
  const [uploadKind, setUploadKind] = useState<'image' | 'video' | null>(null)

  // ─── Advanced Image Toolbar State ─────────────────────────────────────
  const [cropperSrc, setCropperSrc] = useState<string | null>(null)
  const [cropperTarget, setCropperTarget] = useState<{ sectionId: string; replaceIdx?: number } | null>(null)
  const [altModal, setAltModal] = useState<{ sectionId: string; index: number; alt: string } | null>(null)
  const [replaceTarget, setReplaceTarget] = useState<{ sectionId: string; index: number } | null>(null)

  // ─── Advanced panel open state ────────────────────────────────────────
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // ─── Draft restore banner state ───────────────────────────────────────
  const [restorableDraft, setRestorableDraft] = useState<DraftState | null>(null)
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<number | null>(null)

  // ─── Drag/drop for section reorder ────────────────────────────────────
  const [dragSectionId, setDragSectionId] = useState<string | null>(null)
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null)

  // ─── Refs ─────────────────────────────────────────────────────────────
  const isMountedRef = useRef(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // File input refs (rendered once globally, triggered per section via state)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const replaceImageRef = useRef<HTMLInputElement>(null)

  // ═════════════════════════════════════════════════════════════════════
  // MOUNT / UNMOUNT
  // ═════════════════════════════════════════════════════════════════════
  useEffect(() => {
    setMounted(true)
    isMountedRef.current = true

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Check for existing draft
    try {
      const raw = localStorage.getItem(storageKey(slug))
      if (raw) {
        const parsed = JSON.parse(raw) as DraftState
        if (parsed && (parsed.title || parsed.sections?.some(s => s.text || s.images?.length || s.video))) {
          setRestorableDraft(parsed)
        }
      }
    } catch {
      /* ignore */
    }

    setTimeout(() => titleInputRef.current?.focus(), 60)

    return () => {
      document.body.style.overflow = prev
      isMountedRef.current = false
    }
  }, [slug])

  // ═════════════════════════════════════════════════════════════════════
  // AUTOSAVE DRAFT
  // ═════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasContent =
        title.trim() ||
        sections.some(s => s.text.trim() || s.images.length > 0 || s.video) ||
        links.length > 0 ||
        tags.length > 0

      if (!hasContent) return

      try {
        const draft: DraftState = {
          update_type: updateType,
          title,
          sections,
          links,
          tags,
          release_label: releaseLabel,
          comments_disabled: commentsDisabled,
          savedAt: Date.now(),
        }
        localStorage.setItem(storageKey(slug), JSON.stringify(draft))
        if (isMountedRef.current) setLastAutoSavedAt(Date.now())
      } catch {
        // quota ignore
      }
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [slug, updateType, title, sections, links, tags, releaseLabel, commentsDisabled])

  // ═════════════════════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS
  // ═════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key === 'Enter') {
        e.preventDefault(); submit(); return
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault(); saveDraftNow(); return
      }
      if (e.key === 'Escape' && !posting) {
        // Don't close main modal if we are just closing a sub-modal (alt text / cropper)
        if (altModal || cropperSrc) return
        e.preventDefault(); attemptClose(); return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [posting, title, sections, links, tags, updateType, releaseLabel, commentsDisabled, altModal, cropperSrc])

  // ═════════════════════════════════════════════════════════════════════
  // DERIVED
  // ═════════════════════════════════════════════════════════════════════
  const totalImages = useMemo(() => countImages(sections), [sections])
  const totalVideos = useMemo(() => countVideos(sections), [sections])
  const canAddImage = totalImages < MAX_IMAGES_TOTAL
  const canAddVideo = totalVideos < MAX_VIDEOS_TOTAL

  const hasContent = useMemo(() => {
    return (
      title.trim().length > 0 ||
      sections.some(s => s.text.trim() || s.images.length > 0 || s.video)
    )
  }, [title, sections])

  const isDirty = useMemo(() => {
    return (
      hasContent ||
      links.length > 0 ||
      tags.length > 0 ||
      updateType !== 'general' ||
      releaseLabel !== 'none' ||
      commentsDisabled
    )
  }, [hasContent, links, tags, updateType, releaseLabel, commentsDisabled])

  const selectedTypeMeta = UPDATE_TYPES.find(t => t.id === updateType) || UPDATE_TYPES[0]
  const TypeIcon = selectedTypeMeta.icon

  const publishLabel =
    releaseLabel === 'release' ? 'Publish release'
      : releaseLabel === 'pre-release' ? 'Publish pre-release'
      : 'Post update'

  // ═════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═════════════════════════════════════════════════════════════════════

  const attemptClose = useCallback(() => {
    if (posting) return
    if (isDirty) {
      if (!confirm('You have unsaved changes. Close anyway?')) return
    }
    onClose()
  }, [posting, isDirty, onClose])

  const restoreDraft = useCallback((d?: DraftState) => {
    const draft = d || restorableDraft
    if (!draft) return
    setUpdateType(draft.update_type || 'general')
    setTitle(draft.title || '')
    setSections(
      Array.isArray(draft.sections) && draft.sections.length > 0
        ? draft.sections.map(s => ({
            ...s,
            id: s.id || uid(),
            images: Array.isArray(s.images) ? s.images : [], // Handle legacy string[] migration in parent if needed
          }))
        : [makeEmptySection()]
    )
    setLinks(Array.isArray(draft.links) ? draft.links.map(l => ({ ...l, id: l.id || uid() })) : [])
    setTags(Array.isArray(draft.tags) ? draft.tags : [])
    setReleaseLabel(draft.release_label || 'none')
    setCommentsDisabled(!!draft.comments_disabled)
    setRestorableDraft(null)
    toast.success('Draft restored')
  }, [restorableDraft])

  const discardDraft = useCallback(() => {
    try { localStorage.removeItem(storageKey(slug)) } catch {}
    setRestorableDraft(null)
  }, [slug])

  const saveDraftNow = useCallback(() => {
    if (!isDirty) {
      toast.info('Nothing to save')
      return
    }
    try {
      const draft: DraftState = {
        update_type: updateType,
        title,
        sections,
        links,
        tags,
        release_label: releaseLabel,
        comments_disabled: commentsDisabled,
        savedAt: Date.now(),
      }
      localStorage.setItem(storageKey(slug), JSON.stringify(draft))
      setLastAutoSavedAt(Date.now())
      setSavingDraft(true)
      setTimeout(() => setSavingDraft(false), 900)
      toast.success('Draft saved')
    } catch {
      toast.error('Could not save draft (storage full)')
    }
  }, [slug, isDirty, updateType, title, sections, links, tags, releaseLabel, commentsDisabled])

  // ─── Section management ─────────────────────────────────────────────
  const addSection = useCallback(() => {
    if (sections.length >= MAX_SECTIONS) {
      toast.warning(`Maximum ${MAX_SECTIONS} sections`)
      return
    }
    setSections(prev => [...prev, makeEmptySection()])
  }, [sections.length])

  const removeSection = useCallback((id: string) => {
    setSections(prev => {
      if (prev.length <= 1) return [makeEmptySection()]
      return prev.filter(s => s.id !== id)
    })
  }, [])

  const moveSection = useCallback((id: string, direction: 'up' | 'down') => {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === id)
      if (idx === -1) return prev
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[targetIdx]] = [next[targetIdx], next[idx]]
      return next
    })
  }, [])

  const updateSectionText = useCallback((id: string, text: string) => {
    setSections(prev => prev.map(s =>
      s.id === id ? { ...s, text: text.slice(0, MAX_SECTION_TEXT) } : s
    ))
  }, [])

  const removeImageFromSection = useCallback((sectionId: string, index: number) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, images: s.images.filter((_, i) => i !== index) } : s
    ))
  }, [])

  const removeVideoFromSection = useCallback((sectionId: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, video: null } : s))
  }, [])

  // ─── Image Array Reordering (Inside a section) ──────────────────────
  const moveImage = useCallback((sectionId: string, imgIdx: number, direction: 'left' | 'right') => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      const targetIdx = direction === 'left' ? imgIdx - 1 : imgIdx + 1
      if (targetIdx < 0 || targetIdx >= s.images.length) return s
      const nextImgs = [...s.images]
      ;[nextImgs[imgIdx], nextImgs[targetIdx]] = [nextImgs[targetIdx], nextImgs[imgIdx]]
      return { ...s, images: nextImgs }
    }))
  }, [])

  // ─── Media picker ───────────────────────────────────────────────────
  const triggerImagePicker = useCallback((sectionId: string) => {
    if (!canAddImage) { toast.warning(`Maximum ${MAX_IMAGES_TOTAL} images total`); return }
    setUploadingSectionId(sectionId); setUploadKind('image')
    setTimeout(() => imageInputRef.current?.click(), 0)
  }, [canAddImage])

  const triggerVideoPicker = useCallback((sectionId: string) => {
    if (!canAddVideo) { toast.warning(`Only ${MAX_VIDEOS_TOTAL} video per update`); return }
    setUploadingSectionId(sectionId); setUploadKind('video')
    setTimeout(() => videoInputRef.current?.click(), 0)
  }, [canAddVideo])

  const triggerImageReplace = useCallback((sectionId: string, index: number) => {
    setUploadingSectionId(sectionId)
    setUploadKind('image')
    setReplaceTarget({ sectionId, index })
    setTimeout(() => replaceImageRef.current?.click(), 0)
  }, [])

  const handleImageFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>, isReplace = false) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !uploadingSectionId) return

    const reader = new FileReader()
    reader.onload = () => {
      setCropperSrc(reader.result as string)
      setCropperTarget({
        sectionId: uploadingSectionId,
        replaceIdx: isReplace && replaceTarget ? replaceTarget.index : undefined
      })
    }
    reader.onerror = () => {
      toast.error('Failed to read image')
      setUploadingSectionId(null); setUploadKind(null)
    }
    reader.readAsDataURL(file)
  }, [uploadingSectionId, replaceTarget])

  const handleVideoFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !uploadingSectionId) return

    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      toast.error(`Video too large (max ${MAX_VIDEO_SIZE_MB}MB)`)
      setUploadingSectionId(null); setUploadKind(null)
      return
    }

    const targetSection = uploadingSectionId
    try {
      const url = await onUploadImage(file, 'update')
      if (!url) throw new Error('Upload failed')
      if (isMountedRef.current) {
        setSections(prev => prev.map(s => s.id === targetSection ? { ...s, video: url } : s))
      }
    } catch (err: any) {
      toast.error(err?.message || 'Video upload failed')
    } finally {
      if (isMountedRef.current) { setUploadingSectionId(null); setUploadKind(null) }
    }
  }, [uploadingSectionId, onUploadImage])

  const handleCropConfirm = useCallback(async (blob: Blob) => {
    const target = cropperTarget
    setCropperSrc(null); setCropperTarget(null)

    if (!target) return
    setUploadingSectionId(target.sectionId); setUploadKind('image')

    try {
      const file = new File([blob], `update-${Date.now()}.jpg`, { type: 'image/jpeg' })
      const url = await onUploadImage(file, 'update')
      if (!url) throw new Error('Upload failed')
      if (isMountedRef.current) {
        setSections(prev => prev.map(s => {
          if (s.id !== target.sectionId) return s
          if (target.replaceIdx !== undefined) {
            const next = [...s.images]
            next[target.replaceIdx] = { ...next[target.replaceIdx], url }
            return { ...s, images: next }
          }
          return { ...s, images: [...s.images, { url }] }
        }))
      }
    } catch (err: any) {
      toast.error(err?.message || 'Image upload failed')
    } finally {
      if (isMountedRef.current) { setUploadingSectionId(null); setUploadKind(null) }
    }
  }, [cropperTarget, onUploadImage])

  const handleCropCancel = useCallback(() => {
    setCropperSrc(null); setCropperTarget(null)
    setUploadingSectionId(null); setUploadKind(null); setReplaceTarget(null)
  }, [])

  // ─── Alt text save ───────────────────────────────────────────────────
  const saveAltText = useCallback(() => {
    if (!altModal) return
    setSections(prev => prev.map(s => {
      if (s.id !== altModal.sectionId) return s
      const next = [...s.images]
      next[altModal.index] = { ...next[altModal.index], alt: altModal.alt }
      return { ...s, images: next }
    }))
    setAltModal(null)
  }, [altModal])

  // ─── Tag / Link ─────────────────────────────────────────────────────
  const addTag = useCallback(() => {
    const t = tagInput.trim().replace(/^#/, '').toLowerCase()
    if (!t) return
    if (tags.length >= MAX_TAGS) { toast.warning(`Maximum ${MAX_TAGS} tags`); return }
    if (tags.includes(t)) { setTagInput(''); return }
    setTags(prev => [...prev, t.slice(0, MAX_TAG_LENGTH)])
    setTagInput('')
  }, [tagInput, tags])

  const removeTag = useCallback((t: string) => setTags(prev => prev.filter(x => x !== t)), [])

  const addLink = useCallback(() => {
    if (links.length >= MAX_LINKS) { toast.warning(`Maximum ${MAX_LINKS} links`); return }
    setLinks(prev => [...prev, { id: uid(), title: '', url: '' }])
  }, [links.length])

  const updateLink = useCallback((id: string, patch: Partial<UpdateLink>) => {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }, [])

  const removeLink = useCallback((id: string) => setLinks(prev => prev.filter(l => l.id !== id)), [])

  // ─── Drag & drop section reorder ────────────────────────────────────
  const handleDragStart = useCallback((id: string) => setDragSectionId(id), [])
  const handleDragOver = useCallback((e: React.DragEvent, id: string) => { e.preventDefault(); setDragOverSectionId(id) }, [])
  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!dragSectionId || dragSectionId === targetId) {
      setDragSectionId(null); setDragOverSectionId(null)
      return
    }
    setSections(prev => {
      const src = prev.findIndex(s => s.id === dragSectionId)
      const dst = prev.findIndex(s => s.id === targetId)
      if (src === -1 || dst === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(src, 1)
      next.splice(dst, 0, moved)
      return next
    })
    setDragSectionId(null); setDragOverSectionId(null)
  }, [dragSectionId])
  const handleDragEnd = useCallback(() => { setDragSectionId(null); setDragOverSectionId(null) }, [])

  // ─── Validation & Submit ────────────────────────────────────────────
  const validate = useCallback((): string | null => {
    if (!hasContent) return 'Add a title or at least one section with content'
    for (const l of links) {
      if (!l.url.trim() && !l.title.trim()) continue
      if (!l.title.trim()) return `Link "${l.url.slice(0, 30)}" is missing a title`
      if (!l.url.trim()) return `Link "${l.title}" is missing a URL`
      if (!isValidUrl(l.url)) return `Link "${l.title}" has an invalid URL`
    }
    return null
  }, [hasContent, links])

  const submit = useCallback(async () => {
    if (posting) return
    const err = validate()
    if (err) { setGlobalError(err); toast.error(err); return }

    setGlobalError(null); setPosting(true)

    try {
      const cleanSections = sections.filter(s => s.text.trim().length > 0 || s.images.length > 0 || s.video)
      const cleanLinks = links
        .filter(l => l.title.trim() && l.url.trim())
        .map(({ title, url }) => ({ title: title.trim().slice(0, MAX_LINK_TITLE), url: url.trim().slice(0, MAX_LINK_URL) }))

      const payload = {
        update_type: updateType,
        title: title.trim().slice(0, MAX_TITLE) || null,
        sections: cleanSections,
        links: cleanLinks,
        tags,
        release_label: releaseLabel,
        comments_disabled: commentsDisabled,
      }

      const res = await fetch(`/api/projects/${slug}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || `Failed to post (${res.status})`)

      try { localStorage.removeItem(storageKey(slug)) } catch {}

      toast.success(releaseLabel === 'release' ? 'Release published' : releaseLabel === 'pre-release' ? 'Pre-release published' : 'Update posted')
      onPosted(); onClose()
    } catch (e: any) {
      setGlobalError(e?.message || 'Failed to publish'); toast.error(e?.message || 'Failed to publish')
    } finally {
      if (isMountedRef.current) setPosting(false)
    }
  }, [posting, validate, sections, links, updateType, title, tags, releaseLabel, commentsDisabled, slug, onPosted, onClose])

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════

  if (!mounted) return null

  const content = (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-start md:items-center justify-center p-0 md:p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) attemptClose() }}
    >
      <div
        ref={containerRef}
        className="bg-[#0d0d10] border border-white/[0.08] w-full max-w-[860px] md:rounded-2xl overflow-hidden flex flex-col min-h-screen md:min-h-0 md:max-h-[94vh] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="composer-title"
      >
        {/* ─── HEADER ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0 bg-[#0d0d10]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <TypeIcon size={18} weight="fill" className={selectedTypeMeta.color} />
            </div>
            <div>
              <h3 id="composer-title" className="text-[17px] font-bold text-white leading-tight">
                Post an update
              </h3>
              <p className="text-[12px] text-white/50 leading-tight mt-0.5 font-medium">
                Share what's happening with your project
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lastAutoSavedAt && !posting && (
              <span className="hidden sm:flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-white/40">
                <Check size={11} weight="bold" /> Auto-saved
              </span>
            )}
            <button
              onClick={attemptClose}
              disabled={posting}
              aria-label="Close"
              className="w-9 h-9 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] flex items-center justify-center disabled:opacity-40 transition-colors"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        {/* ─── DRAFT RESTORE BANNER ──────────────────────────────────── */}
        {restorableDraft && (
          <div className="flex items-center gap-3 px-6 py-3 bg-amber-500/[0.06] border-b border-amber-500/[0.15] flex-shrink-0">
            <ArrowClockwise size={15} weight="bold" className="text-amber-400 flex-shrink-0" />
            <p className="flex-1 text-[13.5px] font-medium text-amber-100/90">
              You have a draft from earlier — restore it?
            </p>
            <button onClick={discardDraft} className="text-[12.5px] font-semibold text-white/60 hover:text-white transition-colors">
              Discard
            </button>
            <button onClick={() => restoreDraft()} className="text-[12.5px] font-bold text-amber-100 hover:text-white bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 px-3 h-8 rounded-lg transition-colors">
              Restore
            </button>
          </div>
        )}

        {/* ─── BODY (scrollable) ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">

          {/* Top Metadata */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="md:w-1/3">
              <Label>Update type</Label>
              <select
                value={updateType}
                onChange={e => setUpdateType(e.target.value)}
                className="w-full h-11 bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 text-[14.5px] font-semibold text-white outline-none focus:border-white/25 cursor-pointer"
              >
                {UPDATE_TYPES.map(t => <option key={t.id} value={t.id} className="bg-[#12121a]">{t.label}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <Label optional>Title</Label>
              <input
                ref={titleInputRef}
                value={title}
                onChange={e => setTitle(e.target.value.slice(0, MAX_TITLE))}
                placeholder="e.g. v2 Ships with Real-Time Detection"
                className="w-full h-11 bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 text-[15.5px] font-bold text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-colors"
              />
            </div>
          </div>

          {/* Sections Builder */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Sections</Label>
              <span className="text-[11px] font-mono text-white/40">
                {totalImages}/{MAX_IMAGES_TOTAL} images · {totalVideos}/{MAX_VIDEOS_TOTAL} video
              </span>
            </div>

            <div className="space-y-5">
              {sections.map((s, index) => (
                <div key={s.id}
                  onDragOver={(e) => handleDragOver(e, s.id)}
                  onDrop={(e) => handleDrop(e, s.id)}
                  className={`bg-[#121215] border rounded-2xl overflow-hidden transition-all ${
                    dragSectionId === s.id ? 'opacity-40 border-white/[0.2]' :
                    dragOverSectionId === s.id && dragSectionId !== s.id ? 'border-white/[0.35] shadow-[0_0_0_2px_rgba(255,255,255,0.08)]' :
                    'border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04] bg-white/[0.01]">
                    <div className="flex items-center gap-2">
                      <div
                        draggable
                        onDragStart={() => handleDragStart(s.id)}
                        onDragEnd={handleDragEnd}
                        className="p-1 rounded text-white/25 hover:text-white/70 hover:bg-white/[0.05] cursor-grab active:cursor-grabbing transition-colors"
                        title="Drag to reorder"
                      >
                        <DotsSixVertical size={14} weight="bold" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-white/50 uppercase tracking-widest bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-md">
                        Section {index + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveSection(s.id, 'up')} disabled={index === 0} className="w-6 h-6 rounded text-white/30 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"><CaretUp size={12} weight="bold" /></button>
                      <button onClick={() => moveSection(s.id, 'down')} disabled={index === sections.length - 1} className="w-6 h-6 rounded text-white/30 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"><CaretDown size={12} weight="bold" /></button>
                      {sections.length > 1 && <button onClick={() => removeSection(s.id)} className="w-6 h-6 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors ml-1"><Trash size={13} weight="bold"/></button>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.04]">
                    
                    {/* Media Uploader */}
                    <div className="p-5 flex flex-col justify-center min-h-[240px] bg-black/20">
                      {s.images.length > 0 || s.video ? (
                        <div className="w-full grid grid-cols-2 gap-2 mt-auto mb-auto">
                          {s.video && (
                            <div className="col-span-2 relative aspect-video bg-black rounded-xl overflow-hidden border border-white/10 group">
                              <video src={s.video} className="w-full h-full object-cover" />
                              <button onClick={() => removeVideoFromSection(s.id)} className="absolute top-2 right-2 bg-black/60 p-2 rounded-lg text-white hover:bg-red-500/80 transition-colors opacity-0 group-hover:opacity-100 backdrop-blur-md"><Trash size={14} weight="bold"/></button>
                              <span className="absolute bottom-2 left-2 text-[10px] font-mono font-bold text-white bg-black/60 backdrop-blur-md px-2 py-1 rounded-md uppercase tracking-wider">Video</span>
                            </div>
                          )}
                          {s.images.map((img, i) => (
                            <div key={i} className="relative aspect-square bg-black rounded-xl overflow-hidden border border-white/10 group">
                              <img src={img.url} className="w-full h-full object-cover" alt={img.alt} />
                              
                              {/* Advanced Hover Toolbar */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex gap-1 bg-black/50 p-1 rounded-lg backdrop-blur-md border border-white/10">
                                    <button onClick={() => moveImage(s.id, i, 'left')} disabled={i===0} className="p-1 text-white hover:bg-white/20 rounded disabled:opacity-30"><CaretLeft size={14} weight="bold"/></button>
                                    <button onClick={() => moveImage(s.id, i, 'right')} disabled={i===s.images.length-1} className="p-1 text-white hover:bg-white/20 rounded disabled:opacity-30"><CaretRight size={14} weight="bold"/></button>
                                  </div>
                                  <button onClick={() => removeImageFromSection(s.id, i)} className="p-1.5 bg-black/50 border border-white/10 hover:border-red-500/50 hover:bg-red-500/80 rounded-lg text-white backdrop-blur-md transition-colors"><Trash size={14} weight="bold"/></button>
                                </div>
                                <div className="flex justify-center gap-1.5 bg-black/50 p-1.5 rounded-lg backdrop-blur-md border border-white/10 mx-auto">
                                  <button onClick={() => { setCropperSrc(img.url); setCropperTarget({ sectionId: s.id, replaceIdx: i }) }} className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-md" title="Crop & Adjust"><Crop size={15} weight="bold"/></button>
                                  <button onClick={() => setAltModal({ sectionId: s.id, index: i, alt: img.alt || '' })} className={`p-1.5 rounded-md hover:bg-white/20 ${img.alt ? 'text-[#38bdf8]' : 'text-white/80 hover:text-white'}`} title="Alt text (Accessibility)"><TextT size={15} weight="bold"/></button>
                                  <button onClick={() => triggerImageReplace(s.id, i)} className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-md" title="Replace image"><UploadSimple size={15} weight="bold"/></button>
                                </div>
                              </div>
                              {img.alt && <span className="absolute bottom-2 left-2 text-[9px] font-mono font-bold bg-black/60 border border-white/10 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[#38bdf8]">ALT</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="m-auto text-center">
                          <ImageIcon size={36} weight="duotone" className="text-white/20 mx-auto mb-4" />
                          <p className="text-[13px] text-white/40 mb-5 max-w-[200px] mx-auto leading-snug">Add imagery or a video demo to this section.</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mt-5 pt-5 border-t border-white/[0.05] justify-center w-full">
                        <button onClick={() => triggerImagePicker(s.id)} disabled={!canAddImage || uploadingSectionId === s.id} className="flex-1 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.1] text-[13px] font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-colors">
                          <ImageIcon size={16} weight="fill" /> {uploadingSectionId === s.id && uploadKind === 'image' ? 'Uploading...' : 'Image'}
                        </button>
                        <button onClick={() => triggerVideoPicker(s.id)} disabled={!canAddVideo || uploadingSectionId === s.id} className="flex-1 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.1] text-[13px] font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-colors">
                          <VideoCamera size={16} weight="fill" /> {uploadingSectionId === s.id && uploadKind === 'video' ? 'Uploading...' : 'Video'}
                        </button>
                      </div>
                    </div>

                    {/* Text Editor */}
                    <div className="p-0 h-full flex">
                      <textarea 
                        value={s.text}
                        onChange={e => updateSectionText(s.id, e.target.value)}
                        placeholder="Write about this section... (Markdown supported)"
                        className="w-full h-full min-h-[240px] bg-transparent resize-none p-5 text-[14.5px] text-white/90 placeholder:text-white/30 outline-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {sections.length < MAX_SECTIONS && (
                <button onClick={addSection} className="w-full py-4 border border-dashed border-white/[0.15] hover:border-white/[0.3] rounded-xl text-[13.5px] font-bold text-white/50 hover:text-white flex items-center justify-center gap-2 transition-colors">
                  <Plus size={16} weight="bold" /> Add another section
                </button>
              )}
            </div>
          </div>

          {/* Links & Release Label */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Links Builder */}
            <div className="bg-[#121215] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[14px] font-bold text-white">Links</h4>
                {links.length < MAX_LINKS && (
                  <button onClick={addLink} className="text-[12px] font-bold text-white/50 hover:text-white flex items-center gap-1">
                    <Plus size={12} weight="bold" /> Add
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {links.map(l => (
                  <div key={l.id} className="flex gap-2">
                    <input value={l.title} onChange={e => updateLink(l.id, { title: e.target.value })} placeholder="Title" className="w-1/3 h-10 bg-white/[0.03] border border-white/[0.1] rounded-lg px-3 text-[13px] text-white outline-none focus:border-white/25" />
                    <input value={l.url} onChange={e => updateLink(l.id, { url: e.target.value })} placeholder="https://" className="flex-1 h-10 bg-white/[0.03] border border-white/[0.1] rounded-lg px-3 text-[13px] text-white outline-none focus:border-white/25" />
                    <button onClick={() => removeLink(l.id)} className="w-10 h-10 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/[0.06] flex items-center justify-center shrink-0 border border-transparent hover:border-red-500/20"><Trash size={16} weight="fill"/></button>
                  </div>
                ))}
                {links.length === 0 && <p className="text-[13px] text-white/35 py-2">No links added. Add repos, docs, demos.</p>}
              </div>
            </div>

            {/* Release Label */}
            <div className="bg-[#121215] border border-white/[0.06] rounded-xl p-5">
              <h4 className="text-[14px] font-bold text-white mb-4">Release Label</h4>
              <div className="space-y-3">
                {[
                  { id: 'none', label: 'None', desc: 'Standard update' },
                  { id: 'pre-release', label: 'Pre-release', desc: 'Beta / RC (Non-production)' },
                  { id: 'release', label: 'Official Release', desc: 'Production ready' }
                ].map(opt => {
                  const active = releaseLabel === opt.id
                  return (
                    <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${active ? 'bg-white/[0.06] border-white/[0.2]' : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'}`}>
                      <input type="radio" checked={active} onChange={() => setReleaseLabel(opt.id as any)} className="w-4 h-4 accent-white" />
                      <div>
                        <span className={`text-[13.5px] font-bold ${active ? 'text-white' : 'text-white/80'}`}>{opt.label}</span>
                        <span className="text-[11.5px] text-white/40 block mt-0.5">{opt.desc}</span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label optional>Tags</Label>
            <div className="bg-[#121215] border border-white/[0.06] rounded-xl p-4 flex items-center flex-wrap gap-2">
              <Tag size={16} weight="fill" className="text-white/30 mr-1" />
              {tags.map(t => (
                <span key={t} className="bg-white/[0.06] border border-white/[0.12] px-2.5 py-1 rounded-md text-[12px] font-medium text-white flex items-center gap-1.5">
                  #{t} <button onClick={() => removeTag(t)} className="opacity-50 hover:opacity-100 hover:text-red-400"><X size={11} weight="bold"/></button>
                </span>
              ))}
              {tags.length < MAX_TAGS && (
                <input 
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } if (e.key === 'Backspace' && !tagInput && tags.length > 0) setTags(p => p.slice(0, -1)) }}
                  placeholder={tags.length === 0 ? "Add tags (press Enter)..." : ""} 
                  className="bg-transparent text-[13.5px] text-white outline-none min-w-[150px] flex-1 placeholder:text-white/30" 
                />
              )}
            </div>
          </div>

          {/* Global Error */}
          {globalError && (
            <div className="flex items-start gap-2.5 text-[13px] font-medium text-red-300 bg-red-500/[0.08] border border-red-500/25 rounded-xl px-4 py-3">
              <Warning size={16} weight="fill" className="text-red-400 mt-0.5 shrink-0" />
              <span className="leading-relaxed">{globalError}</span>
            </div>
          )}

        </div>

        {/* ─── FOOTER ────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-white/[0.06] bg-[#0a0a0f] flex items-center justify-between flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-[11.5px] text-white/35 font-mono">
            <kbd className="px-1.5 py-1 rounded border border-white/[0.1] bg-white/[0.03]">⌘</kbd>
            <kbd className="px-1.5 py-1 rounded border border-white/[0.1] bg-white/[0.03]">↵</kbd>
            <span>to publish</span>
          </div>

          <div className="flex gap-2.5 ml-auto">
            <button onClick={saveDraftNow} disabled={!isDirty || posting} className="px-5 h-10 rounded-xl text-[13px] font-bold text-white/70 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] disabled:opacity-40 transition-colors flex items-center gap-2">
              {savingDraft ? <><CircleNotch size={14} className="animate-spin" /> Saving</> : <><FloppyDisk size={14} weight="bold" /> Save Draft</>}
            </button>
            <button onClick={submit} disabled={posting || (!title && !sections.some(s => s.text || s.images.length || s.video))} className={`px-6 h-10 rounded-xl text-[13.5px] font-extrabold text-black disabled:opacity-50 flex items-center gap-2 transition-colors shadow-lg ${releaseLabel !== 'none' ? 'bg-emerald-400 hover:bg-emerald-300' : 'bg-white hover:bg-white/90'}`}>
              {posting ? <CircleNotch size={14} className="animate-spin" /> : <PaperPlaneRight size={14} weight="fill" />} 
              {publishLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden inputs & Modals */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileSelected} />
      <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleVideoFileSelected} />
      <input ref={replaceImageRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageFileSelected(e, true)} />
      
      {cropperSrc && cropperTarget && (
        <ImageCropperModal imageSrc={cropperSrc} aspect={16/9} onCancel={handleCropCancel} onConfirm={handleCropConfirm} />
      )}
      
      {altModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.1] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h4 className="text-[16px] font-bold text-white mb-1">Alt Text</h4>
            <p className="text-[12px] text-white/50 mb-4">Describe the image for screen readers and SEO.</p>
            <input autoFocus value={altModal.alt} onChange={e => setAltModal({...altModal, alt: e.target.value.slice(0, 200)})} className="w-full h-11 bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 text-[13.5px] text-white outline-none focus:border-[#38bdf8] mb-4" placeholder="Image description..." />
            <div className="flex justify-end gap-2">
              <button onClick={() => setAltModal(null)} className="px-4 h-9 text-[13px] font-semibold text-white/60 hover:text-white rounded-lg border border-white/[0.1]">Cancel</button>
              <button onClick={saveAltText} className="px-5 h-9 bg-white text-black text-[13px] font-bold rounded-lg hover:bg-white/90">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
  return createPortal(content, document.body)
}

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="flex items-center gap-1.5 mb-2.5">
      <span className="text-[11.5px] font-mono uppercase tracking-widest text-white/50 font-bold">
        {children}
      </span>
      {optional && <span className="text-[10px] font-mono text-white/25">optional</span>}
    </label>
  )
}