// ============================================================
// lib/coco/tools/validator.ts
// Validates LLM tool arguments against CocoParamSchema.
// ============================================================

import type { CocoParamSchema } from '@/types/coco'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateToolArguments(
  args: Record<string, unknown>,
  schema: CocoParamSchema
): ValidationResult {
  const errors: string[] = []

  if (!args || typeof args !== 'object') {
    return { valid: false, errors: ['Arguments must be an object'] }
  }

  // Check required fields
  if (schema.required) {
    for (const req of schema.required) {
      if (args[req] === undefined || args[req] === null || args[req] === '') {
        errors.push(`Missing required parameter: '${req}'`)
      }
    }
  }

  // Check property types
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const val = args[key]
      if (val === undefined) continue

      const typeValid = checkType(val, propSchema.type)
      if (!typeValid) {
        errors.push(`Invalid type for '${key}': expected ${String(propSchema.type)}, got ${typeof val}`)
      }

      if (propSchema.enum && !propSchema.enum.includes(val as any)) {
        errors.push(`Invalid value for '${key}': must be one of ${propSchema.enum.join(', ')}`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

function checkType(val: unknown, expectedType: unknown): boolean {
  if (!expectedType) return true
  const types = Array.isArray(expectedType) ? expectedType : [expectedType]

  return types.some(t => {
    switch (t) {
      case 'string': return typeof val === 'string'
      case 'number': return typeof val === 'number' && !isNaN(val)
      case 'boolean': return typeof val === 'boolean'
      case 'object': return typeof val === 'object' && val !== null && !Array.isArray(val)
      case 'array': return Array.isArray(val)
      case 'null': return val === null
      default: return true
    }
  })
}