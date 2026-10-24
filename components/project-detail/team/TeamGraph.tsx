'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState,
  addEdge, Connection, Edge, Node, ReactFlowProvider, useReactFlow,
  BackgroundVariant, MarkerType
} from '@xyflow/react'

import { MemberNode } from './nodes/MemberNode'
import { OpenRoleNode } from './nodes/OpenRoleNode'
import { ComponentNode } from './nodes/ComponentNode'
import { TeamGraphToolbar } from './TeamGraphToolbar'
import { TeamGraphLegend, EDGE_COLORS } from './TeamGraphLegend'
import { GraphSidebar } from './GraphSidebar'
import { AddNodeModal } from './AddNodeModal'
import { EdgeConfigModal } from './EdgeConfigModal'

const nodeTypes = {
  member: MemberNode,
  open_role: OpenRoleNode,
  component: ComponentNode,
}

interface Props {
  slug: string
  isOwner: boolean
}

function TeamGraphInner({ slug, isOwner }: Props) {
  const { fitView } = useReactFlow()

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const [rawMembers, setRawMembers] = useState<any[]>([])
  const [rawRoles, setRawRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [connectingMode, setConnectingMode] = useState(false)
  const [addNodeOpen, setAddNodeOpen] = useState(false)
  const [pendingEdge, setPendingEdge] = useState<Connection | null>(null)
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null)
  const [sidebarQuery, setSidebarQuery] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const positionSnapshot = useRef<Record<string, { x: number; y: number }>>({})

  // ─── Fetch data ───
  const fetchGraph = useCallback(async () => {
    try {
      const res = await fetch('/api/projects/' + slug + '/graph')
      const json = await res.json()
      setRawMembers(json.members || [])
      setRawRoles(json.roles || [])
      const memberMap: Record<string, any> = {}
      for (const m of (json.members || [])) {
        memberMap[m.user_id] = m
      }
      const roleMap: Record<string, any> = {}
      for (const r of (json.roles || [])) {
        roleMap[r.id] = r
      }

      const buildNode = (n: any): Node => {
        const enriched: any = {
          label: n.label,
          subtitle: n.subtitle,
          color: n.color,
          ...(n.style_data || {}),
        }
        if (n.node_type === 'member' && n.member_id) {
          const m = memberMap[n.member_id]
          if (m?.user) {
            enriched.avatar_url = m.user.avatar_url
            enriched.is_verified = m.user.is_verified
            enriched.user_id = m.user_id
            enriched.subtitle = m.role || n.subtitle
          }
        }
        if (n.node_type === 'open_role' && n.role_id) {
          const r = roleMap[n.role_id]
          if (r) {
            enriched.applicants = r.applicants
            enriched.role_id = r.id
          }
        }
        if (n.node_type === 'component') {
          enriched.component_type = n.component_type
        }
        return {
          id: n.id,
          type: n.node_type,
          position: { x: n.position_x, y: n.position_y },
          data: enriched,
        }
      }

      const rfNodes: Node[] = (json.nodes || []).map(buildNode)
      const rfEdges: Edge[] = (json.edges || []).map((e: any) => ({
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        type: 'smoothstep',
        animated: e.animated || (e.style_data?.animated ?? false),
        label: e.label,
        style: { stroke: EDGE_COLORS[e.relationship_type] || '#94a3b8', strokeWidth: 2 },
        labelStyle: { fill: EDGE_COLORS[e.relationship_type] || '#94a3b8', fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: '#12121a', fillOpacity: 0.9 },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 4,
        markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLORS[e.relationship_type] || '#94a3b8' },
      }))

      setNodes(rfNodes)
      setEdges(rfEdges)

      // Snapshot positions
      const snap: Record<string, { x: number; y: number }> = {}
      for (const n of rfNodes) snap[n.id] = { x: n.position.x, y: n.position.y }
      positionSnapshot.current = snap
      setHasUnsavedChanges(false)
    } catch (e) {
      console.error('Graph fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [slug, setNodes, setEdges])

  useEffect(() => { fetchGraph() }, [fetchGraph])

  // Fit after load
  useEffect(() => {
    if (!loading && nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 100)
    }
  }, [loading, nodes.length, fitView])

  // Detect position changes when editing
  useEffect(() => {
    if (!isEditing) return
    let changed = false
    for (const n of nodes) {
      const s = positionSnapshot.current[n.id]
      if (s && (Math.abs(s.x - n.position.x) > 1 || Math.abs(s.y - n.position.y) > 1)) {
        changed = true
        break
      }
    }
    setHasUnsavedChanges(changed)
  }, [nodes, isEditing])

  // ─── Save positions ───
  const savePositions = async () => {
    try {
      const payload = nodes.map(n => ({
        id: n.id,
        position_x: n.position.x,
        position_y: n.position.y,
      }))
      const res = await fetch('/api/projects/' + slug + '/graph', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: payload }),
      })
      if (!res.ok) throw new Error('Save failed')
      const snap: Record<string, { x: number; y: number }> = {}
      for (const n of nodes) snap[n.id] = { x: n.position.x, y: n.position.y }
      positionSnapshot.current = snap
      setHasUnsavedChanges(false)
    } catch (e) {
      console.error(e)
      alert('Failed to save graph')
    }
  }

  // ─── Connect nodes ───
  const onConnect = useCallback((connection: Connection) => {
    if (!isEditing) return
    setPendingEdge(connection)
  }, [isEditing])

  const confirmConnection = async (relType: string, label: string | null, animated: boolean) => {
    if (!pendingEdge?.source || !pendingEdge?.target) { setPendingEdge(null); return }
    try {
      const res = await fetch('/api/projects/' + slug + '/graph/edges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_node_id: pendingEdge.source,
          target_node_id: pendingEdge.target,
          relationship_type: relType,
          label,
          animated,
        }),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error); setPendingEdge(null); return }

      setEdges(eds => addEdge({
        id: json.edge.id,
        source: pendingEdge.source!,
        target: pendingEdge.target!,
        type: 'smoothstep',
        animated,
        label,
        style: { stroke: EDGE_COLORS[relType] || '#94a3b8', strokeWidth: 2 },
        labelStyle: { fill: EDGE_COLORS[relType] || '#94a3b8', fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: '#12121a', fillOpacity: 0.9 },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 4,
        markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLORS[relType] || '#94a3b8' },
      }, eds))
    } catch (e) { console.error(e) }
    setPendingEdge(null)
  }

  // ─── Delete nodes/edges (Delete key when editing) ───
  const onNodesDelete = useCallback(async (deleted: Node[]) => {
    if (!isEditing) return
    for (const n of deleted) {
      try {
        await fetch('/api/projects/' + slug + '/graph/nodes/' + n.id, { method: 'DELETE' })
      } catch (e) { console.error(e) }
    }
  }, [isEditing, slug])

  const onEdgesDelete = useCallback(async (deleted: Edge[]) => {
    if (!isEditing) return
    for (const e of deleted) {
      try {
        await fetch('/api/projects/' + slug + '/graph/edges/' + e.id, { method: 'DELETE' })
      } catch (err) { console.error(err) }
    }
  }, [isEditing, slug])

  // ─── Select node → expand sidebar detail ───
  const onNodeClick = useCallback((_: any, node: Node) => {
    const d: any = node.data
    if (node.type === 'member' && d.user_id) {
      // Find full member data
      const member = rawMembers.find((m: any) => m.user_id === d.user_id)
      setSelectedNodeData({
        user_id: d.user_id,
        label: d.label,
        subtitle: d.subtitle,
        avatar_url: d.avatar_url,
        is_verified: d.is_verified,
        username: member?.user?.username,
        tagline: member?.user?.tagline,
        joined_at: member?.joined_at,
        location: member?.user?.location,
        skills: d.skills || [],
        responsibilities: d.responsibilities || [],
      })
    }
  }, [rawMembers])

  const onSelectMember = useCallback((userId: string) => {
    const node = nodes.find(n => (n.data as any).user_id === userId && n.type === 'member')
    if (!node) return
    // Trigger click
    onNodeClick(null, node)
    // Highlight by selecting
    setNodes(nds => nds.map(n => ({ ...n, selected: n.id === node.id })))
  }, [nodes, onNodeClick, setNodes])

  // ─── Auto layout ───
  const autoLayout = () => {
    // Simple layered layout: owner top, members middle, roles + components bottom
    const owner = nodes.find(n => (n.data as any).is_owner)
    const members = nodes.filter(n => n.type === 'member' && !(n.data as any).is_owner)
    const roles = nodes.filter(n => n.type === 'open_role')
    const components = nodes.filter(n => n.type === 'component')

    const centerX = 700
    const updated: Node[] = []

    if (owner) {
      updated.push({ ...owner, position: { x: centerX, y: 50 } })
    }

    // Members in row
    const memberSpacing = 260
    const memberStartX = centerX - ((members.length - 1) * memberSpacing) / 2
    members.forEach((m, i) => {
      updated.push({ ...m, position: { x: memberStartX + i * memberSpacing, y: 300 } })
    })

    // Roles in row below
    const roleSpacing = 240
    const roleStartX = centerX - ((roles.length - 1) * roleSpacing) / 2
    roles.forEach((r, i) => {
      updated.push({ ...r, position: { x: roleStartX + i * roleSpacing, y: 550 } })
    })

    // Components
    const cSpacing = 220
    const cStartX = centerX - ((components.length - 1) * cSpacing) / 2
    components.forEach((c, i) => {
      updated.push({ ...c, position: { x: cStartX + i * cSpacing, y: 780 } })
    })

    // Merge (keep unpositioned nodes as-is)
    const updatedMap = new Map(updated.map(n => [n.id, n]))
    const merged = nodes.map(n => updatedMap.get(n.id) || n)
    setNodes(merged)
    setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 50)
  }

  const existingMemberIds = useMemo(
    () => nodes.filter(n => n.type === 'member').map(n => (n.data as any).user_id).filter(Boolean),
    [nodes]
  )

  return (
    <div className="flex flex-col lg:flex-row w-full h-[720px] bg-[#0a0a0f] border border-white/[0.08] rounded-xl overflow-hidden">

      {/* Canvas */}
      <div className="relative flex-1 min-w-0">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={isEditing ? onNodesChange : undefined}
              onEdgesChange={isEditing ? onEdgesChange : undefined}
              onConnect={onConnect}
              onNodesDelete={onNodesDelete}
              onEdgesDelete={onEdgesDelete}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              defaultEdgeOptions={{ type: 'smoothstep' }}
              proOptions={{ hideAttribution: true }}
              nodesDraggable={isEditing}
              nodesConnectable={isEditing}
              elementsSelectable
              minZoom={0.2}
              maxZoom={2}
              className="bg-[#0a0a0f]"
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.08)" />
              <Controls
                position="top-left"
                className="!bg-[#12121a]/95 !border !border-white/[0.08] !rounded-lg !shadow-xl"
                showInteractive={false}
              />
              <MiniMap
                position="top-right"
                className="!bg-[#12121a]/95 !border !border-white/[0.08] !rounded-lg"
                nodeColor={(n) => {
                  if (n.type === 'open_role') return '#fb923c'
                  if (n.type === 'component') return '#60a5fa'
                  return '#a78bfa'
                }}
                maskColor="rgba(10,10,15,0.7)"
                pannable
                zoomable
              />
            </ReactFlow>

            <TeamGraphLegend />

            <TeamGraphToolbar
              isEditing={isEditing}
              isOwner={isOwner}
              connectingMode={connectingMode}
              onToggleEdit={() => {
                if (isEditing && hasUnsavedChanges) {
                  savePositions()
                }
                setIsEditing(!isEditing)
              }}
              onAddNode={() => setAddNodeOpen(true)}
              onToggleConnect={() => setConnectingMode(!connectingMode)}
              onFit={() => fitView({ padding: 0.2, duration: 400 })}
              onAutoLayout={autoLayout}
              onSave={savePositions}
              hasUnsavedChanges={hasUnsavedChanges}
            />
          </>
        )}
      </div>

      {/* Sidebar */}
      <GraphSidebar
        members={rawMembers}
        selectedNodeData={selectedNodeData}
        query={sidebarQuery}
        onQueryChange={setSidebarQuery}
        onSelectMember={onSelectMember}
        onCloseDetails={() => {
          setSelectedNodeData(null)
          setNodes(nds => nds.map(n => ({ ...n, selected: false })))
        }}
      />

      {/* Modals */}
      {addNodeOpen && (
        <AddNodeModal
          slug={slug}
          existingMemberIds={existingMemberIds}
          onClose={() => setAddNodeOpen(false)}
          onAdded={fetchGraph}
        />
      )}

      {pendingEdge && (
        <EdgeConfigModal
          onClose={() => setPendingEdge(null)}
          onConfirm={confirmConnection}
        />
      )}
    </div>
  )
}

export function TeamGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <TeamGraphInner {...props} />
    </ReactFlowProvider>
  )
}
