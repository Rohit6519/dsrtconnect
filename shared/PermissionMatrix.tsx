'use client'

import { Check } from '@phosphor-icons/react'

interface Permission {
  id: string
  label: string
  description: string
  category: string
}

const PERMISSION_CATALOG: Permission[] = [
  { id: 'view_venture', category: 'General', label: 'View Venture', description: 'Access internal venture workspace' },
  { id: 'edit_overview', category: 'General', label: 'Edit Overview', description: 'Update mission, vision, and pitch' },
  { id: 'view_team', category: 'Team', label: 'View Team Directory', description: 'See internal team roster' },
  { id: 'invite_members', category: 'Team', label: 'Invite Members', description: 'Send new team invitations' },
  { id: 'manage_roles', category: 'Team', label: 'Manage Roles', description: 'Change roles, suspend, remove members' },
  { id: 'publish_updates', category: 'Content', label: 'Publish Updates', description: 'Author and publish update posts' },
  { id: 'manage_documents', category: 'Content', label: 'Manage Knowledge Base', description: 'Create, edit, delete documents' },
  { id: 'manage_products', category: 'Content', label: 'Manage Products', description: 'Add and edit venture products' },
  { id: 'view_financials', category: 'Financial', label: 'View Financials', description: 'Access decks and runway numbers' },
  { id: 'manage_settings', category: 'Admin', label: 'Manage Settings', description: 'Change visibility, slug, integrations' },
]

const TEMPLATES: Record<string, string[]> = {
  co_founder: ['view_venture', 'edit_overview', 'view_team', 'invite_members', 'manage_roles', 'publish_updates', 'manage_documents', 'manage_products', 'view_financials'],
  executive: ['view_venture', 'edit_overview', 'view_team', 'invite_members', 'publish_updates', 'manage_documents', 'manage_products'],
  member: ['view_venture', 'view_team', 'publish_updates', 'manage_documents'],
  advisor: ['view_venture', 'view_team', 'publish_updates'],
  contractor: ['view_venture', 'view_team'],
  investor: ['view_venture', 'view_team', 'view_financials'],
  viewer: ['view_venture'],
}

const TEMPLATE_OPTIONS = [
  { id: 'co_founder', label: 'Co-founder', desc: 'Full operational + team management' },
  { id: 'executive', label: 'Executive', desc: 'Lead operational authority' },
  { id: 'member', label: 'Team Member', desc: 'Core collaborator (default)' },
  { id: 'advisor', label: 'Advisor', desc: 'Strategic counsel access' },
  { id: 'contractor', label: 'Contractor', desc: 'Restricted view-only' },
  { id: 'investor', label: 'Investor', desc: 'Financial + update access' },
]

interface Props {
  template: string
  permissions: string[]
  onTemplateChange: (template: string) => void
  onPermissionsChange: (permissions: string[]) => void
}

export function PermissionMatrix({
  template, permissions, onTemplateChange, onPermissionsChange
}: Props) {
  const grouped = PERMISSION_CATALOG.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {} as Record<string, Permission[]>)

  const handleTemplate = (t: string) => {
    onTemplateChange(t)
    onPermissionsChange(TEMPLATES[t] || [])
  }

  const togglePermission = (id: string) => {
    const next = permissions.includes(id)
      ? permissions.filter(p => p !== id)
      : [...permissions, id]
    onPermissionsChange(next)

    // Detect if this matches an existing template
    const matchedTemplate = Object.entries(TEMPLATES).find(([_, perms]) => {
      const sortedA = [...perms].sort().join(',')
      const sortedB = [...next].sort().join(',')
      return sortedA === sortedB
    })
    onTemplateChange(matchedTemplate?.[0] || 'custom')
  }

  return (
    <div className="space-y-4">
      {/* Template selector */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-2">
          Starting Template
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {TEMPLATE_OPTIONS.map(t => (
            <button
              key={t.id}
              onClick={() => handleTemplate(t.id)}
              className={
                'p-3 rounded-lg border text-left transition-all ' +
                (template === t.id
                  ? 'border-white/20 bg-white/[0.06]'
                  : 'border-white/[0.06] bg-[#0d0d10] hover:border-white/[0.12] hover:bg-white/[0.02]')
              }
            >
              <p className={
                'text-[12px] font-bold ' +
                (template === t.id ? 'text-white' : 'text-zinc-300')
              }>
                {t.label}
              </p>
              <p className="text-[10.5px] text-zinc-500 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
        {template === 'custom' && (
          <p className="text-[10.5px] font-mono uppercase tracking-widest text-amber-400 font-bold mt-2">
            Custom permissions
          </p>
        )}
      </div>

      {/* Permission checkboxes */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-2">
          Granular Permissions
        </p>
        <div className="bg-[#0d0d10] border border-white/[0.06] rounded-xl divide-y divide-white/[0.04]">
          {Object.entries(grouped).map(([category, perms]) => (
            <div key={category} className="p-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-2">
                {category}
              </p>
              <div className="space-y-1">
                {perms.map(p => {
                  const checked = permissions.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePermission(p.id)}
                      className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/[0.02] transition-colors text-left"
                    >
                      <div className={
                        'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ' +
                        (checked
                          ? 'bg-white border-white'
                          : 'border-zinc-700')
                      }>
                        {checked && <Check size={10} weight="bold" className="text-black" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={
                          'text-[12px] font-semibold ' +
                          (checked ? 'text-white' : 'text-zinc-400')
                        }>
                          {p.label}
                        </p>
                        <p className="text-[10.5px] text-zinc-500 mt-0.5">{p.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}