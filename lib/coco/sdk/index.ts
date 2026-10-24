// ============================================================
// lib/coco/sdk/index.ts
// ============================================================

export { CocoProvider, useCocoUi } from './CocoProvider'
export { useCocoContext } from './useCocoContext'
export { useCocoStream } from './useCocoStream'
export { setCocoContext, getCocoContext } from './context-registry'
export { useCocoComponent } from './useCocoComponent'
export { useCocoAutoWire } from './useCocoAutoWire'
export { useCocoVoice } from './useCocoVoice'
export {
  registerCocoComponent,
  getCocoComponent,
  listCocoComponents,
  snapshotCocoComponents,
  dispatchCocoComponentAction,
  subscribeCocoComponents,
} from './component-registry'
export type {
  CocoComponentAction,
  CocoRegisteredComponent,
  CocoComponentSnapshot,
} from './component-registry'
export * from './adapters'