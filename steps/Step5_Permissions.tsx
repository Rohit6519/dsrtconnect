'use client'

import { PermissionMatrix } from '../shared/PermissionMatrix'

interface Props {
  template: string
  permissions: string[]
  onTemplateChange: (t: string) => void
  onPermissionsChange: (p: string[]) => void
}

export function Step5_Permissions({
  template, permissions, onTemplateChange, onPermissionsChange
}: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[15px] font-bold text-white">Access & Permissions</h3>
        <p className="text-[12.5px] text-zinc-500 mt-1">
          Choose a template to start, then fine-tune individual permissions.
        </p>
      </div>

      <PermissionMatrix
        template={template}
        permissions={permissions}
        onTemplateChange={onTemplateChange}
        onPermissionsChange={onPermissionsChange}
      />
    </div>
  )
}