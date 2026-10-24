'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import {
  // Section header
  LinkSimple,
  // Column icons
  Rocket, BookOpen, Buildings, UsersThree, Scales, EnvelopeSimple,
  // Link type icons (professional, solid fills applied via weight="fill")
  Globe, GithubLogo, Play, DeviceMobile, Presentation,
  VideoCamera, FileText, Newspaper, Broadcast,
  FilePdf, FileZip, FileDoc,
  // Actions
  Plus, Trash, PencilSimple, ArrowSquareOut, Check,
  Info, X, UploadSimple, CircleNotch, Warning,
  ArrowRight, Download,
} from '@phosphor-icons/react'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface LinkRow {
  id: string
  type: string
  label: string | null
  url: string
  position: number
}

interface ProjectDocument {
  id: string
  doc_type: string
  title: string | null
  file_name: string
  file_url: string
  file_path: string
  mime_type: string
  size_bytes: number
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

interface DocLimits {
  label: string
  maxBytes: number
  extensions: string[]
}

interface Props {
  slug: string
  projectId: string
  links: LinkRow[]
  isOwner: boolean
  onAddLink: (type: string, url: string, label?: string) => Promise<void>
  onDeleteLink: (id: string) => Promise<void>
}

// ═══════════════════════════════════════════════════════════════════════════
// LINK / DOC REGISTRY
// - kind: 'url' = enter URL only
// - kind: 'upload' = real file upload to project-documents bucket
// - kind: 'both' = either paste URL OR upload file
// ═══════════════════════════════════════════════════════════════════════════

interface EntrySpec {
  id: string
  label: string
  icon: any
  kind: 'url' | 'upload' | 'both'
  urlPlaceholder?: string
  docType?: string  // Maps to project_documents.doc_type when kind is 'upload' or 'both'
  info: string      // Tooltip text
  urlType?: string  // Maps to project_links.type when kind is 'url' or 'both'
}

interface Column {
  id: string
  label: string
  icon: any
  entries: EntrySpec[]
}

const COLUMNS: Column[] = [
  // ─── PRODUCT ────────────────────────────────────────────────────────
  {
    id: 'product',
    label: 'Product',
    icon: Rocket,
    entries: [
      {
        id: 'website',
        label: 'Website',
        icon: Globe,
        kind: 'url',
        urlType: 'website',
        urlPlaceholder: 'https://yourproject.com',
        info: 'Your main product website or landing page.',
      },
      {
        id: 'demo',
        label: 'Live Demo',
        icon: Play,
        kind: 'url',
        urlType: 'demo',
        urlPlaceholder: 'https://demo.yourproject.com',
        info: 'A working, interactive demo people can try right now.',
      },
      {
        id: 'app',
        label: 'App',
        icon: DeviceMobile,
        kind: 'url',
        urlType: 'app',
        urlPlaceholder: 'https://apps.apple.com/… or Play Store URL',
        info: 'App Store, Google Play, or web app installation URL.',
      },
      {
        id: 'video',
        label: 'Demo Video',
        icon: VideoCamera,
        kind: 'url',
        urlType: 'video',
        urlPlaceholder: 'https://youtube.com/… or vimeo.com/…',
        info: 'YouTube, Vimeo, or Loom link showing your product in action.',
      },
    ],
  },

  // ─── DOCUMENTATION ──────────────────────────────────────────────────
  {
    id: 'documentation',
    label: 'Documentation',
    icon: BookOpen,
    entries: [
      {
        id: 'repository',
        label: 'Repository',
        icon: GithubLogo,
        kind: 'url',
        urlType: 'repository',
        urlPlaceholder: 'https://github.com/user/repo',
        info: 'GitHub, GitLab, or Bitbucket repository URL.',
      },
      {
        id: 'documentation',
        label: 'Documentation',
        icon: FileText,
        kind: 'both',
        urlType: 'documentation',
        docType: 'documentation',
        urlPlaceholder: 'https://docs.yourproject.com',
        info: 'Link to hosted docs (Notion, GitBook, ReadMe) OR upload a PDF, Markdown, or text file (max 15 MB).',
      },
      {
        id: 'research_paper',
        label: 'Research Paper',
        icon: FilePdf,
        kind: 'both',
        urlType: 'paper',
        docType: 'research_paper',
        urlPlaceholder: 'https://arxiv.org/abs/…',
        info: 'Link to arXiv, journal, or preprint OR upload a PDF (max 20 MB).',
      },
      {
        id: 'publication',
        label: 'Publication',
        icon: Newspaper,
        kind: 'url',
        urlType: 'publication',
        urlPlaceholder: 'https://journal.com/…',
        info: 'Link to peer-reviewed publication or academic journal.',
      },
    ],
  },

  // ─── BUSINESS ───────────────────────────────────────────────────────
  {
    id: 'business',
    label: 'Business',
    icon: Buildings,
    entries: [
      {
        id: 'pitch_deck',
        label: 'Pitch Deck',
        icon: Presentation,
        kind: 'both',
        urlType: 'pitch_deck',
        docType: 'pitch_deck',
        urlPlaceholder: 'https://pitch.com/… or Figma link',
        info: 'Link to hosted deck (Pitch, Figma) OR upload PDF, PPT, PPTX, or Keynote (max 25 MB).',
      },
      {
        id: 'business_plan',
        label: 'Business Plan',
        icon: FileDoc,
        kind: 'upload',
        docType: 'business_plan',
        info: 'Upload a PDF or Word document (max 15 MB). Only visible to your team and viewers of this project.',
      },
      {
        id: 'whitepaper',
        label: 'Whitepaper',
        icon: FilePdf,
        kind: 'upload',
        docType: 'whitepaper',
        info: 'Upload a PDF of your technical or business whitepaper (max 15 MB).',
      },
    ],
  },

  // ─── COMMUNITY ──────────────────────────────────────────────────────
  {
    id: 'community',
    label: 'Community',
    icon: UsersThree,
    entries: [
      {
        id: 'press',
        label: 'Press / Media',
        icon: Broadcast,
        kind: 'url',
        urlType: 'press',
        urlPlaceholder: 'https://techcrunch.com/…',
        info: 'Link to press coverage, news article, or media feature.',
      },
      {
        id: 'press_kit',
        label: 'Press Kit',
        icon: FileZip,
        kind: 'upload',
        docType: 'press_kit',
        info: 'Upload a ZIP or PDF containing logos, screenshots, and brand assets for journalists (max 30 MB).',
      },
    ],
  },

  // ─── CONTACT ────────────────────────────────────────────────────────
  {
    id: 'contact',
    label: 'Contact',
    icon: EnvelopeSimple,
    entries: [
      {
        id: 'contact',
        label: 'Email',
        icon: EnvelopeSimple,
        kind: 'url',
        urlType: 'contact',
        urlPlaceholder: 'mailto:hello@yourproject.com',
        info: 'Mailto link or contact form URL where people can reach you.',
      },
    ],
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function isValidUrl(u: string): boolean {
  return /^https?:\/\/.+/.test(u.trim()) || /^mailto:.+@.+/.test(u.trim())
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatMB(bytes: number): string {
  return `${Math.floor(bytes / (1024 * 1024))} MB`
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ProjectLinksFooter({
  slug,
  projectId,
  links,
  isOwner,
  onAddLink,
  onDeleteLink,
}: Props) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [docLimits, setDocLimits] = useState<Record<string, DocLimits>>({})
  const [loading, setLoading] = useState(true)
  const [openEntry, setOpenEntry] = useState<EntrySpec | null>(null)

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // ─── Fetch existing documents ───────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${slug}/documents`, { cache: 'no-store' })
      const json = await res.json()
      if (!isMountedRef.current) return
      if (res.ok) {
        setDocuments(json.documents || [])
        setDocLimits(json.limits || {})
      }
    } catch (e) {
      console.error('[LinksFooter] fetch docs failed:', e)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [slug])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  // ─── Derived lookups ────────────────────────────────────────────────
  const linksByType = useMemo(() => {
    const map = new Map<string, LinkRow>()
    for (const l of links) map.set(l.type, l)
    return map
  }, [links])

  const docsByType = useMemo(() => {
    const map = new Map<string, ProjectDocument[]>()
    for (const d of documents) {
      const list = map.get(d.doc_type) || []
      list.push(d)
      map.set(d.doc_type, list)
    }
    return map
  }, [documents])

  // ─── Actions passed to modal ────────────────────────────────────────
  const handleSaveUrl = useCallback(async (type: string, url: string) => {
    await onAddLink(type, url)
  }, [onAddLink])

  const handleDeleteUrl = useCallback(async (id: string) => {
    await onDeleteLink(id)
  }, [onDeleteLink])

  const handleUploadFile = useCallback(async (docType: string, file: File, title?: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('doc_type', docType)
    if (title) fd.append('title', title)

    const res = await fetch(`/api/projects/${slug}/documents`, {
      method: 'POST',
      body: fd,
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.error || 'Upload failed')

    if (isMountedRef.current) {
      setDocuments(prev => [json.document, ...prev])
    }
  }, [slug])

  const handleDeleteFile = useCallback(async (docId: string) => {
    const res = await fetch(`/api/projects/${slug}/documents?id=${docId}`, {
      method: 'DELETE',
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error || 'Delete failed')

    if (isMountedRef.current) {
      setDocuments(prev => prev.filter(d => d.id !== docId))
    }
  }, [slug])

  // ─── Should we render at all? ───────────────────────────────────────
  const hasAnyContent = links.length > 0 || documents.length > 0
  if (!isOwner && !hasAnyContent) return null

  return (
    <>
      <footer className="mt-8 pt-8 border-t border-white/[0.06]">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <LinkSimple size={17} weight="fill" className="text-white/50" />
            <div>
              <h3 className="text-[15px] font-bold text-white leading-tight tracking-tight">
                Project Links & Documents
              </h3>
              <p className="text-[12px] text-white/45 mt-0.5">
                Everything about this project in one place.
              </p>
            </div>
          </div>
        </div>

        {/* Multi-column grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-8">
          {COLUMNS.map(col => (
            <ColumnRender
              key={col.id}
              column={col}
              linksByType={linksByType}
              docsByType={docsByType}
              isOwner={isOwner}
              onOpen={setOpenEntry}
            />
          ))}
        </div>
      </footer>

      {/* Add/Edit modal */}
      {openEntry && (
        <EntryModal
          entry={openEntry}
          existingUrl={openEntry.urlType ? linksByType.get(openEntry.urlType) : undefined}
          existingDocs={openEntry.docType ? (docsByType.get(openEntry.docType) || []) : []}
          docLimits={docLimits}
          onClose={() => setOpenEntry(null)}
          onSaveUrl={handleSaveUrl}
          onDeleteUrl={handleDeleteUrl}
          onUploadFile={handleUploadFile}
          onDeleteFile={handleDeleteFile}
        />
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COLUMN RENDERER
// ═══════════════════════════════════════════════════════════════════════════

function ColumnRender({
  column,
  linksByType,
  docsByType,
  isOwner,
  onOpen,
}: {
  column: Column
  linksByType: Map<string, LinkRow>
  docsByType: Map<string, ProjectDocument[]>
  isOwner: boolean
  onOpen: (entry: EntrySpec) => void
}) {
  const ColIcon = column.icon

  // Filter entries: non-owners only see rows with content
  const visibleEntries = column.entries.filter(e => {
    if (isOwner) return true
    const hasUrl = e.urlType && linksByType.has(e.urlType)
    const hasDoc = e.docType && (docsByType.get(e.docType)?.length ?? 0) > 0
    return hasUrl || hasDoc
  })

  if (visibleEntries.length === 0) return null

  return (
    <div>
      {/* Column header */}
      <div className="flex items-center gap-1.5 mb-3">
        <ColIcon size={12} weight="fill" className="text-white/40" />
        <h4 className="text-[10.5px] font-mono uppercase tracking-widest text-white/55 font-bold">
          {column.label}
        </h4>
      </div>

      {/* Column rows */}
      <ul className="space-y-2.5">
        {visibleEntries.map(entry => (
          <EntryRow
            key={entry.id}
            entry={entry}
            existingUrl={entry.urlType ? linksByType.get(entry.urlType) : undefined}
            existingDocs={entry.docType ? (docsByType.get(entry.docType) || []) : []}
            isOwner={isOwner}
            onOpen={() => onOpen(entry)}
          />
        ))}
      </ul>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY ROW (single link/doc in a column)
// ═══════════════════════════════════════════════════════════════════════════

function EntryRow({
  entry,
  existingUrl,
  existingDocs,
  isOwner,
  onOpen,
}: {
  entry: EntrySpec
  existingUrl?: LinkRow
  existingDocs: ProjectDocument[]
  isOwner: boolean
  onOpen: () => void
}) {
  const Icon = entry.icon
  const hasUrl = !!existingUrl
  const hasDocs = existingDocs.length > 0
  const hasContent = hasUrl || hasDocs

  // Non-owner: render as link if has content
  if (!isOwner) {
    if (hasUrl && !hasDocs) {
      return (
        <li>
          <a
            href={existingUrl!.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-[12.5px] text-white/70 hover:text-white transition-colors"
          >
            <Icon size={13} weight="fill" className="text-white/50 group-hover:text-white transition-colors shrink-0" />
            <span className="truncate">{entry.label}</span>
            <ArrowSquareOut size={10} weight="bold" className="text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
          </a>
        </li>
      )
    }
    if (hasDocs && !hasUrl) {
      const primary = existingDocs[0]
      return (
        <li>
          <a
            href={primary.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-[12.5px] text-white/70 hover:text-white transition-colors"
          >
            <Icon size={13} weight="fill" className="text-white/50 group-hover:text-white transition-colors shrink-0" />
            <span className="truncate">{entry.label}</span>
            <Download size={10} weight="bold" className="text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
            {existingDocs.length > 1 && (
              <span className="text-[10px] font-mono text-white/40 shrink-0">+{existingDocs.length - 1}</span>
            )}
          </a>
        </li>
      )
    }
    if (hasUrl && hasDocs) {
      // Non-owner has both — open modal to view all
      return (
        <li>
          <button
            onClick={onOpen}
            className="group flex items-center gap-2 text-[12.5px] text-white/70 hover:text-white transition-colors w-full text-left"
          >
            <Icon size={13} weight="fill" className="text-white/50 group-hover:text-white transition-colors shrink-0" />
            <span className="truncate">{entry.label}</span>
            <span className="text-[10px] font-mono text-white/40 shrink-0">
              {1 + existingDocs.length} items
            </span>
          </button>
        </li>
      )
    }
    return null
  }

  // Owner: always clickable to open modal
  return (
    <li>
      <button
        onClick={onOpen}
        className="group flex items-center gap-2 w-full text-left transition-colors"
      >
        <Icon
          size={13}
          weight="fill"
          className={hasContent ? 'text-white/70 group-hover:text-white shrink-0' : 'text-white/30 group-hover:text-white/60 shrink-0'}
        />
        <span
          className={
            'text-[12.5px] truncate flex-1 transition-colors ' +
            (hasContent ? 'text-white/80 group-hover:text-white font-medium' : 'text-white/40 group-hover:text-white/70')
          }
        >
          {entry.label}
        </span>
        {hasContent ? (
          <span className="text-[10px] font-mono font-bold text-white/40 group-hover:text-white/70 transition-colors shrink-0">
            {hasDocs && hasUrl ? `${1 + existingDocs.length}` : hasDocs ? existingDocs.length : ''}
            {(hasDocs || hasUrl) && (
              <Check size={10} weight="bold" className="inline ml-1 text-emerald-400" />
            )}
          </span>
        ) : (
          <Plus size={11} weight="bold" className="text-white/25 group-hover:text-white/60 transition-colors shrink-0" />
        )}
      </button>
    </li>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY MODAL — handles both URL entry and file upload
// ═══════════════════════════════════════════════════════════════════════════

function EntryModal({
  entry,
  existingUrl,
  existingDocs,
  docLimits,
  onClose,
  onSaveUrl,
  onDeleteUrl,
  onUploadFile,
  onDeleteFile,
}: {
  entry: EntrySpec
  existingUrl?: LinkRow
  existingDocs: ProjectDocument[]
  docLimits: Record<string, DocLimits>
  onClose: () => void
  onSaveUrl: (type: string, url: string) => Promise<void>
  onDeleteUrl: (id: string) => Promise<void>
  onUploadFile: (docType: string, file: File, title?: string) => Promise<void>
  onDeleteFile: (docId: string) => Promise<void>
}) {
  const [mounted, setMounted] = useState(false)
  const [urlDraft, setUrlDraft] = useState(existingUrl?.url || '')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [savingUrl, setSavingUrl] = useState(false)

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const isMountedRef = useRef(true)

  const Icon = entry.icon
  const limits = entry.docType ? docLimits[entry.docType] : null
  const canUploadFile = entry.kind === 'upload' || entry.kind === 'both'
  const canAddUrl = entry.kind === 'url' || entry.kind === 'both'

  useEffect(() => {
    isMountedRef.current = true
    setMounted(true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      isMountedRef.current = false
      document.body.style.overflow = prev
    }
  }, [])

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !savingUrl && !uploading) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, savingUrl, uploading])

  const handleSaveUrl = async () => {
    if (!entry.urlType) return
    const url = urlDraft.trim()
    if (!url) { setUrlError('Enter a URL'); return }
    if (!isValidUrl(url)) { setUrlError('Must start with https:// or mailto:'); return }

    setSavingUrl(true); setUrlError(null)
    try {
      // If updating existing, delete first
      if (existingUrl && existingUrl.url !== url) {
        await onDeleteUrl(existingUrl.id)
      }
      await onSaveUrl(entry.urlType, url)
      toast.success(existingUrl ? 'Link updated' : 'Link added')
      onClose()
    } catch (e: any) {
      setUrlError(e?.message || 'Failed to save')
    } finally {
      if (isMountedRef.current) setSavingUrl(false)
    }
  }

  const handleDeleteUrl = async () => {
    if (!existingUrl) return
    if (!confirm(`Remove this ${entry.label} link?`)) return
    setSavingUrl(true)
    try {
      await onDeleteUrl(existingUrl.id)
      toast.success('Link removed')
      onClose()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete')
    } finally {
      if (isMountedRef.current) setSavingUrl(false)
    }
  }

  const validateFile = (f: File): string | null => {
    if (!limits) return 'Upload not supported for this type'
    if (f.size <= 0) return 'File is empty'
    if (f.size > limits.maxBytes) {
      return `File too large (${formatBytes(f.size)}). Max is ${formatMB(limits.maxBytes)}.`
    }
    const ext = f.name.split('.').pop()?.toLowerCase() || ''
    if (!limits.extensions.includes(ext)) {
      return `Invalid format. Accepts: ${limits.extensions.map(e => '.' + e).join(', ')}`
    }
    return null
  }

  const handleFileSelected = (f: File | null) => {
    if (!f) return
    const err = validateFile(f)
    if (err) { setUploadError(err); return }
    setUploadError(null)
    setUploadFile(f)
    if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^.]+$/, '').slice(0, 120))
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelected(e.target.files?.[0] || null)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelected(e.dataTransfer.files?.[0] || null)
  }

  const handleUpload = async () => {
    if (!uploadFile || !entry.docType) return
    setUploading(true); setUploadError(null)
    try {
      await onUploadFile(entry.docType, uploadFile, uploadTitle.trim() || undefined)
      toast.success(`${entry.label} uploaded`)
      setUploadFile(null); setUploadTitle('')
      if (entry.kind === 'upload') onClose()
    } catch (e: any) {
      setUploadError(e?.message || 'Upload failed')
    } finally {
      if (isMountedRef.current) setUploading(false)
    }
  }

  const handleDeleteFile = async (docId: string) => {
    if (deletingId === docId) {
      try {
        await onDeleteFile(docId)
        toast.success('Document removed')
      } catch (e: any) {
        toast.error(e?.message || 'Failed to delete')
      } finally {
        if (isMountedRef.current) setDeletingId(null)
      }
    } else {
      setDeletingId(docId)
      setTimeout(() => {
        if (isMountedRef.current) setDeletingId(prev => prev === docId ? null : prev)
      }, 3000)
    }
  }

  if (!mounted) return null

  const content = (
    <div
      className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-start md:items-center justify-center p-0 md:p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget && !savingUrl && !uploading) onClose() }}
    >
      <div
        className="bg-[#0d0d10] border border-white/[0.08] w-full max-w-[560px] md:rounded-2xl overflow-hidden flex flex-col min-h-screen md:min-h-0 md:max-h-[92vh] shadow-[0_0_80px_rgba(0,0,0,0.7)]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
            <Icon size={17} weight="fill" className="text-white/70" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-[16px] font-bold text-white leading-tight">{entry.label}</h3>
            <p className="text-[12.5px] text-white/55 leading-snug mt-1 flex items-start gap-1">
              <Info size={12} weight="fill" className="text-white/40 mt-[3px] shrink-0" />
              <span>{entry.info}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={savingUrl || uploading}
            aria-label="Close"
            className="w-8 h-8 rounded-md text-white/50 hover:text-white hover:bg-white/[0.06] flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* ─── URL SECTION ────────────────────────────────────── */}
            {canAddUrl && (
              <div>
                <label className="flex items-center gap-1.5 mb-2">
                  <LinkSimple size={12} weight="fill" className="text-white/40" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/50 font-bold">
                    URL
                  </span>
                  {existingUrl && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold ml-1">
                      · Added
                    </span>
                  )}
                </label>
                <div className="space-y-2">
                  <input
                    autoFocus={!existingUrl}
                    value={urlDraft}
                    onChange={(e) => { setUrlDraft(e.target.value); setUrlError(null) }}
                    placeholder={entry.urlPlaceholder}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !savingUrl) { e.preventDefault(); handleSaveUrl() }
                    }}
                    className="w-full h-11 bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 text-[13.5px] text-white placeholder:text-white/30 outline-none focus:border-white/25 focus:bg-white/[0.06] transition-colors"
                  />
                  {urlError && (
                    <p className="text-[11.5px] text-red-400 flex items-center gap-1">
                      <Warning size={12} weight="fill" /> {urlError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    {existingUrl && (
                      <button
                        onClick={handleDeleteUrl}
                        disabled={savingUrl}
                        className="px-3 h-9 text-[12.5px] font-semibold text-red-300 hover:text-red-200 hover:bg-red-500/10 border border-red-500/25 rounded-md transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                    <button
                      onClick={handleSaveUrl}
                      disabled={savingUrl || !urlDraft.trim()}
                      className="flex-1 h-9 text-[13px] font-bold text-black bg-white hover:bg-white/90 rounded-md disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                    >
                      {savingUrl ? (
                        <><CircleNotch size={12} className="animate-spin" /> Saving...</>
                      ) : existingUrl ? (
                        <><Check size={13} weight="bold" /> Update link</>
                      ) : (
                        <><Plus size={13} weight="bold" /> Save link</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Divider between URL and upload if both allowed */}
            {canAddUrl && canUploadFile && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/30 font-bold">or</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
            )}

            {/* ─── UPLOAD SECTION ─────────────────────────────────── */}
            {canUploadFile && limits && (
              <div>
                <label className="flex items-center gap-1.5 mb-2">
                  <UploadSimple size={12} weight="fill" className="text-white/40" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/50 font-bold">
                    Upload file
                  </span>
                  <span className="text-[10px] font-mono text-white/35 ml-auto">
                    {limits.extensions.map(e => '.' + e).join(' · ')} · max {formatMB(limits.maxBytes)}
                  </span>
                </label>

                {/* Drop zone */}
                {!uploadFile ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={
                      'cursor-pointer rounded-lg border-2 border-dashed transition-colors p-6 text-center ' +
                      (dragOver
                        ? 'border-white/40 bg-white/[0.04]'
                        : 'border-white/[0.15] hover:border-white/[0.3] hover:bg-white/[0.02]')
                    }
                  >
                    <UploadSimple size={24} weight="fill" className="text-white/40 mx-auto mb-2" />
                    <p className="text-[13px] font-semibold text-white/70 mb-1">
                      Click or drag file here
                    </p>
                    <p className="text-[11px] text-white/40">
                      {limits.extensions.map(e => '.' + e).join(', ')} · up to {formatMB(limits.maxBytes)}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={limits.extensions.map(e => '.' + e).join(',')}
                      className="hidden"
                      onChange={handleFileInput}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Selected file preview */}
                    <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.1] rounded-lg">
                      <div className="w-10 h-10 rounded-md bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                        <FileText size={18} weight="fill" className="text-white/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white truncate">{uploadFile.name}</p>
                        <p className="text-[11px] text-white/50">{formatBytes(uploadFile.size)}</p>
                      </div>
                      <button
                        onClick={() => { setUploadFile(null); setUploadTitle(''); setUploadError(null) }}
                        disabled={uploading}
                        className="text-white/40 hover:text-red-400 p-1.5 disabled:opacity-50 transition-colors"
                        aria-label="Remove file"
                      >
                        <X size={14} weight="bold" />
                      </button>
                    </div>

                    {/* Optional title */}
                    <div>
                      <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 font-bold block mb-1.5">
                        Display title (optional)
                      </label>
                      <input
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value.slice(0, 120))}
                        placeholder={uploadFile.name.replace(/\.[^.]+$/, '')}
                        disabled={uploading}
                        className="w-full h-10 bg-white/[0.04] border border-white/[0.1] rounded-md px-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/25 focus:bg-white/[0.06] transition-colors disabled:opacity-60"
                      />
                    </div>

                    {uploadError && (
                      <p className="text-[11.5px] text-red-400 flex items-center gap-1">
                        <Warning size={12} weight="fill" /> {uploadError}
                      </p>
                    )}

                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="w-full h-10 text-[13px] font-bold text-black bg-white hover:bg-white/90 rounded-md disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {uploading ? (
                        <><CircleNotch size={12} className="animate-spin" /> Uploading...</>
                      ) : (
                        <><UploadSimple size={13} weight="bold" /> Upload {entry.label}</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ─── EXISTING DOCS LIST ─────────────────────────────── */}
            {existingDocs.length > 0 && (
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 font-bold block mb-2">
                  Uploaded ({existingDocs.length})
                </label>
                <div className="space-y-2">
                  {existingDocs.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.08] rounded-lg group hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="w-9 h-9 rounded-md bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                        <FileText size={16} weight="fill" className="text-white/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] font-semibold text-white hover:underline truncate block"
                        >
                          {doc.title || doc.file_name}
                        </a>
                        <p className="text-[10.5px] text-white/45">
                          {formatBytes(doc.size_bytes)} · {new Date(doc.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/40 hover:text-white p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Open"
                      >
                        <ArrowSquareOut size={13} weight="bold" />
                      </a>
                      <button
                        onClick={() => handleDeleteFile(doc.id)}
                        className={
                          'p-1.5 rounded transition-colors ' +
                          (deletingId === doc.id
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'text-white/30 hover:text-red-400 hover:bg-white/[0.05]')
                        }
                        title={deletingId === doc.id ? 'Click again to confirm' : 'Remove'}
                      >
                        <Trash size={13} weight={deletingId === doc.id ? 'fill' : 'regular'} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer close */}
        <div className="border-t border-white/[0.06] bg-[#0a0a0f] px-5 py-3 flex-shrink-0 flex justify-end">
          <button
            onClick={onClose}
            disabled={savingUrl || uploading}
            className="px-4 h-9 text-[13px] font-medium text-white/70 hover:text-white border border-white/[0.1] hover:bg-white/[0.04] rounded-md disabled:opacity-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}