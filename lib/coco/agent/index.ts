// ============================================================
// lib/coco/agent/index.ts
// Barrel export for Agent Runtime.
// ============================================================

export { runAgentTurn } from './runtime'
export type { RunAgentParams } from './runtime'
export { classifyIntent } from './intent-router'
export { buildSystemPrompt } from './prompt'