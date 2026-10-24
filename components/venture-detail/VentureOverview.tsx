'use client'

import { VentureAbout } from './overview/VentureAbout'
import { VentureMedia } from './overview/VentureMedia'
import { VentureQuestions } from './overview/VentureQuestions'
import { VentureUpdatesSection } from './overview/VentureUpdatesSection'

interface Props {
  venture: any
  isOwner: boolean
  onUpdate: (patch: any) => Promise<void>
}

export function VentureOverview({ venture, isOwner, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <VentureAbout venture={venture} isOwner={isOwner} onUpdate={onUpdate} />
      <VentureMedia venture={venture} isOwner={isOwner} />
      <VentureQuestions venture={venture} isOwner={isOwner} onUpdate={onUpdate} />
      <VentureUpdatesSection venture={venture} isOwner={isOwner} />
    </div>
  )
}