// ============================================================
// lib/coco/context/index.ts
// Public entry for the Context Engine.
// ============================================================

export { compileContext } from './compiler'
export type { CompileContextParams, CompileContextResult } from './compiler'

export { sanitizeClientHint, stripInjectionMarkers } from './security'
export { resolveUserPermissions } from './permissions'