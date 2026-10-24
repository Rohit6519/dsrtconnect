'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  MagnifyingGlass, CaretDown, Plus, Minus, CornersOut,
  CircleNotch, WarningCircle
} from '@phosphor-icons/react'
import { DsrtAvatar } from '@/components/dsrt'
import { cn } from '@/lib/utils'
import { MemberInspector } from '../MemberInspector'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  projectId: string
  slug: string
  isOwner: boolean
}

const NODE_W = 240
const NODE_H = 68
const X_GAP = 40
const Y_GAP = 80

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-400',
  invited: 'bg-amber-400',
  viewed: 'bg-amber-400',
  onboarding: 'bg-blue-400',
  paused: 'bg-orange-400',
  removed: 'bg-white/30',
}

type NodeData = {
  id: string
  x: number
  y: number
  member: any
}

// ═══════════════════════════════════════════════════════════════════════════
// TREE LAYOUT ENGINE (Auto-calculates positions)
// ═══════════════════════════════════════════════════════════════════════════

function buildTreeLayout(members: any[]): { nodes: NodeData[]; width: number; height: number } {
  if (members.length === 0) return { nodes: [], width: 0, height: 0 }

  const childrenMap = new Map<string, any[]>()
  const roots: any[] = []

  // 1. Build adjacency list & find roots
  members.forEach(m => {
    // If reports_to is null, or points to a non-existent member, it's a root
    const parentExists = m.reports_to ? members.some(x => x.id === m.reports_to) : false
    if (!m.reports_to || !parentExists) {
      roots.push(m)
    } else {
      if (!childrenMap.has(m.reports_to)) childrenMap.set(m.reports_to, [])
      childrenMap.get(m.reports_to)!.push(m)
    }
  })

  // Sort children primarily by leadership, then join date to keep the graph stable
  const sortChildren = (arr: any[]) => {
    arr.sort((a, b) => {
      if (a.is_lead && !b.is_lead) return -1
      if (!a.is_lead && b.is_lead) return 1
      return new Date(a.joined_at || 0).getTime() - new Date(b.joined_at || 0).getTime()
    })
  }
  sortChildren(roots)
  childrenMap.forEach(arr => sortChildren(arr))

  // 2. Calculate subtree widths recursively
  const subtreeWidths = new Map<string, number>()
  function calcWidth(mId: string): number {
    const children = childrenMap.get(mId) || []
    if (children.length === 0) {
      subtreeWidths.set(mId, NODE_W)
      return NODE_W
    }
    const w = children.reduce((sum, c) => sum + calcWidth(c.id) + X_GAP, 0) - X_GAP
    const finalW = Math.max(NODE_W, w)
    subtreeWidths.set(mId, finalW)
    return finalW
  }
  roots.forEach(r => calcWidth(r.id))

  // 3. Assign X, Y coordinates
  const nodes: NodeData[] = []
  let maxDepth = 0

  function assignPositions(m: any, xOffset: number, depth: number) {
    if (depth > maxDepth) maxDepth = depth
    const w = subtreeWidths.get(m.id) || NODE_W
    
    // Center node in its allocated subtree width
    const nodeX = xOffset + (w / 2) - (NODE_W / 2)
    const nodeY = depth * (NODE_H + Y_GAP)

    nodes.push({ id: m.id, x: nodeX, y: nodeY, member: m })

    let currentX = xOffset
    const children = childrenMap.get(m.id) || []
    children.forEach(c => {
      const cw = subtreeWidths.get(c.id) || NODE_W
      assignPositions(c, currentX, depth + 1)
      currentX += cw + X_GAP
    })
  }

  let globalX = 0
  roots.forEach(r => {
    const w = subtreeWidths.get(r.id) || NODE_W
    assignPositions(r, globalX, 0)
    globalX += w + X_GAP * 2 // Extra gap between completely disconnected trees
  })

  return { 
    nodes, 
    width: globalX, 
    height: (maxDepth + 1) * (NODE_H + Y_GAP) 
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function TeamGraph({ projectId, slug, isOwner }: Props) {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Toolbar state
  const [mode, setMode] = useState<'structure' | 'responsibilities' | 'work' | 'collaboration'>('structure')
  const [modeDropdown, setModeDropdown] = useState(false)
  const [search, setSearch] = useState('')
  
  // Graph engine state
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // ─── Fetch Current User ──────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (isMountedRef.current) setCurrentUserId(data.user?.id || null)
    })
  }, [])

  // ─── Fetch Data ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: rpcErr } = await supabase.rpc('list_project_team_members', {
        p_project_id: projectId,
        p_include_removed: false,
      })

      if (rpcErr) throw rpcErr
      if (isMountedRef.current) setMembers(data || [])
    } catch (e: any) {
      if (isMountedRef.current) setError(e?.message || 'Failed to load team graph')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Calculate Layout ────────────────────────────────────────────────
  const { nodes, width: graphW, height: graphH } = useMemo(() => buildTreeLayout(members), [members])

  // ─── Initial Centering ───────────────────────────────────────────────
  const fitGraph = useCallback(() => {
    if (!containerRef.current || nodes.length === 0) return
    const rect = containerRef.current.getBoundingClientRect()
    
    // Calculate required scale to fit (with padding)
    const padding = 100
    const scaleX = (rect.width - padding) / graphW
    const scaleY = (rect.height - padding) / graphH
    const scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.2) // clamp zoom

    // Center it
    const x = (rect.width - graphW * scale) / 2
    const y = (rect.height - graphH * scale) / 2 + 30 // slight top offset

    setTransform({ x, y, scale })
  }, [graphW, graphH, nodes.length])

  useEffect(() => {
    if (!loading && nodes.length > 0) {
      // Delay slightly to ensure container is fully rendered
      setTimeout(fitGraph, 50)
    }
  }, [loading, nodes.length, fitGraph])

  // Re-fit when inspector opens/closes to account for container width change
  useEffect(() => {
    if (!loading && nodes.length > 0) {
      const t = setTimeout(fitGraph, 350) // wait for transition
      return () => clearTimeout(t)
    }
  }, [selectedNode])

  // ─── Pan / Zoom Handlers ─────────────────────────────────────────────
  
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      e.preventDefault()
      const zoomSensitivity = 0.002
      const delta = -e.deltaY * zoomSensitivity
      
      setTransform(prev => {
        const newScale = Math.min(Math.max(prev.scale * (1 + delta), 0.2), 2.5)
        
        // Calculate pointer position relative to container
        if (!containerRef.current) return prev
        const rect = containerRef.current.getBoundingClientRect()
        const pointerX = e.clientX - rect.left
        const pointerY = e.clientY - rect.top

        // Adjust X/Y so we zoom into the pointer
        const scaleRatio = newScale / prev.scale
        const x = pointerX - (pointerX - prev.x) * scaleRatio
        const y = pointerY - (pointerY - prev.y) * scaleRatio

        return { x, y, scale: newScale }
      })
    } else {
      // Pan
      setTransform(prev => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }))
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only left click pan
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('.dsrt-node')) return // Don't pan when clicking a node
    
    setIsDragging(true)
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y })
    if (containerRef.current) containerRef.current.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    if (containerRef.current) containerRef.current.releasePointerCapture(e.pointerId)
  }

  const handleZoom = (delta: number) => {
    setTransform(prev => {
      const newScale = Math.min(Math.max(prev.scale + delta, 0.2), 2.5)
      // Zoom into center
      if (!containerRef.current) return { ...prev, scale: newScale }
      const rect = containerRef.current.getBoundingClientRect()
      const cx = rect.width / 2
      const cy = rect.height / 2
      const ratio = newScale / prev.scale
      return {
        x: cx - (cx - prev.x) * ratio,
        y: cy - (cy - prev.y) * ratio,
        scale: newScale
      }
    })
  }

  // ─── SVG Edge Drawing ────────────────────────────────────────────────
  
  const drawEdges = () => {
    const paths: JSX.Element[] = []
    
    nodes.forEach(node => {
      if (!node.member.reports_to) return
      
      const parent = nodes.find(n => n.id === node.member.reports_to)
      if (!parent) return

      // Draw bezier from bottom center of parent to top center of child
      const startX = parent.x + (NODE_W / 2)
      const startY = parent.y + NODE_H
      const endX = node.x + (NODE_W / 2)
      const endY = node.y
      
      // Control points for smooth vertical curve
      const ctrlY = startY + (Y_GAP / 2)
      const d = `M ${startX} ${startY} C ${startX} ${ctrlY}, ${endX} ${ctrlY}, ${endX} ${endY}`

      // Highlight logic (if a node is selected, fade out unrelated edges)
      let opacity = 0.4
      let stroke = '#ffffff'
      if (selectedNode) {
        if (node.id === selectedNode || parent.id === selectedNode) {
          opacity = 0.8
          stroke = '#38bdf8' // Highlight cyan
        } else {
          opacity = 0.1
        }
      }

      paths.push(
        <path
          key={`${parent.id}-${node.id}`}
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeOpacity={opacity}
          className="transition-all duration-300"
        />
      )
    })
    return paths
  }

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="h-[600px] flex flex-col items-center justify-center gap-3 border border-white/[0.04] bg-white/[0.01] rounded-3xl">
        <CircleNotch size={20} className="animate-spin text-white/30" />
        <span className="text-[12px] font-mono text-white/30 uppercase tracking-wider">Rendering graph...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[600px] flex flex-col items-center justify-center gap-3 bg-red-500/[0.02] border border-red-500/10 rounded-3xl">
        <WarningCircle size={24} className="text-red-400" />
        <span className="text-[13px] text-red-300">{error}</span>
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="h-[600px] flex flex-col items-center justify-center border border-white/[0.04] bg-white/[0.01] rounded-3xl text-center p-6">
        <p className="text-[15px] font-bold text-white mb-2">Team Graph</p>
        <p className="text-[13.5px] text-white/40 max-w-sm">
          Your team structure will appear here once you add members and define their reporting lines.
        </p>
      </div>
    )
  }

  const selectedMember = selectedNode ? nodes.find(n => n.id === selectedNode)?.member || null : null

  return (
    <div className="flex gap-0">
      <div className={cn(
        "relative h-[65vh] min-h-[500px] rounded-2xl overflow-hidden border border-white/[0.08] bg-[#05070D] flex flex-col animate-in fade-in duration-300 shadow-xl transition-all",
        selectedNode ? 'w-full lg:w-[calc(100%-404px)]' : 'w-full'
      )}>
        
        {/* ─── DOT PATTERN BACKGROUND ─── */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '24px 24px',
            backgroundPosition: `${transform.x % 24}px ${transform.y % 24}px`
          }}
        />

        {/* ─── TOP TOOLBAR ─── */}
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          
          {/* Left: Mode Switcher */}
          <div className="relative pointer-events-auto">
            <button 
              onClick={() => setModeDropdown(!modeDropdown)}
              className="flex items-center gap-1.5 h-9 px-3.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[13px] font-bold text-white hover:bg-black/80 transition-colors shadow-lg"
            >
              Structure <CaretDown size={12} weight="bold" className="text-white/50" />
            </button>
            
            {modeDropdown && (
              <>
                <div className="fixed inset-0" onClick={() => setModeDropdown(false)} />
                <div className="absolute top-11 left-0 w-48 bg-[#0a0a0f] border border-white/[0.1] rounded-xl shadow-2xl py-1 z-30">
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-white/30 font-bold border-b border-white/[0.06] mb-1">Graph Mode</div>
                  <button onClick={() => { setMode('structure'); setModeDropdown(false) }} className="w-full text-left px-3 py-2 text-[12.5px] font-bold text-[#38bdf8] bg-[#38bdf8]/10 flex items-center justify-between">Structure <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" /></button>
                  <button onClick={() => setModeDropdown(false)} className="w-full text-left px-3 py-2 text-[12.5px] font-medium text-white/40 hover:text-white hover:bg-white/[0.04]">Responsibilities <span className="text-[9px] ml-1 opacity-50 uppercase">Soon</span></button>
                  <button onClick={() => setModeDropdown(false)} className="w-full text-left px-3 py-2 text-[12.5px] font-medium text-white/40 hover:text-white hover:bg-white/[0.04]">Work <span className="text-[9px] ml-1 opacity-50 uppercase">Soon</span></button>
                  <button onClick={() => setModeDropdown(false)} className="w-full text-left px-3 py-2 text-[12.5px] font-medium text-white/40 hover:text-white hover:bg-white/[0.04]">Collaboration <span className="text-[9px] ml-1 opacity-50 uppercase">Soon</span></button>
                </div>
              </>
            )}
          </div>

          {/* Right: Search & Controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="relative hidden sm:block">
              <MagnifyingGlass size={13} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search graph..."
                className="w-48 h-9 pl-8 pr-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[12.5px] text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-colors shadow-lg"
              />
            </div>
            
            <div className="flex items-center bg-black/60 backdrop-blur-md border border-white/10 rounded-lg shadow-lg">
              <button onClick={() => handleZoom(-0.2)} className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.06] rounded-l-lg transition-colors"><Minus size={14} weight="bold"/></button>
              <div className="w-px h-5 bg-white/10" />
              <button onClick={fitGraph} className="px-3 h-9 flex items-center justify-center text-[11px] font-mono font-bold text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"><CornersOut size={13} weight="bold" className="mr-1" /> FIT</button>
              <div className="w-px h-5 bg-white/10" />
              <button onClick={() => handleZoom(0.2)} className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.06] rounded-r-lg transition-colors"><Plus size={14} weight="bold"/></button>
            </div>
          </div>
        </div>

        {/* ─── CANVAS LAYER ─── */}
        <div 
          ref={containerRef}
          className={cn(
            "flex-1 w-full h-full relative overflow-hidden outline-none",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={() => setSelectedNode(null)} // Click background to deselect
        >
          <div 
            className="absolute transform-origin-top-left transition-transform duration-75 ease-out"
            style={{ 
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              width: graphW,
              height: graphH,
            }}
          >
            {/* Edges SVG Layer */}
            <svg className="absolute inset-0 pointer-events-none" width={graphW} height={graphH}>
              {drawEdges()}
            </svg>

            {/* Nodes HTML Layer */}
            {nodes.map(node => {
              const m = node.member
              const q = search.trim().toLowerCase()
              const isMatch = q && (m.user?.full_name?.toLowerCase().includes(q) || m.role?.toLowerCase().includes(q))
              const isFaded = q ? !isMatch : (selectedNode && selectedNode !== node.id)
              const isSelected = selectedNode === node.id

              return (
                <div
                  key={node.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedNode(isSelected ? null : node.id) }}
                  className={cn(
                    "dsrt-node absolute flex items-center gap-3 p-3 rounded-xl border bg-[#0a0a0f] transition-all cursor-pointer shadow-lg",
                    isFaded ? "opacity-30 border-white/[0.04]" : "opacity-100 border-white/[0.12] hover:border-white/[0.25] hover:bg-white/[0.02]",
                    isSelected && "border-[#38bdf8]/50 bg-[#38bdf8]/10 shadow-[0_0_20px_rgba(56,189,248,0.2)] ring-1 ring-[#38bdf8]"
                  )}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: NODE_W,
                    height: NODE_H,
                  }}
                >
                  <DsrtAvatar src={m.user?.avatar_url} name={m.user?.full_name || '?'} size="md" className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-bold text-white truncate leading-tight mb-0.5">
                      {m.user?.full_name || 'Pending Member'}
                    </p>
                    <p className="text-[11px] font-mono text-white/50 truncate uppercase tracking-wider">
                      {m.role || 'Member'}
                    </p>
                  </div>
                  
                  {/* Status Dot */}
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#0a0a0f] flex items-center justify-center">
                    <div className={cn("w-2 h-2 rounded-full shadow-sm", STATUS_COLORS[m.member_state] || 'bg-white/30')} title={m.member_state} />
                  </div>
                  
                  {/* Leadership Badge */}
                  {m.is_lead && (
                    <div className="absolute -bottom-2 right-3 px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[9px] font-bold uppercase tracking-widest shadow-sm">
                      Lead
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* ─── MEMBER INSPECTOR PANEL ─── */}
      {selectedNode && selectedMember && (
        <MemberInspector 
          member={selectedMember}
          slug={slug}
          isOwner={isOwner}
          currentUserId={currentUserId}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  )
}