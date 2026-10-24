// ============================================================
// lib/operations/validators.ts
// Server-side authoritative question-type validation
// + declarative conditional-rule evaluator.
// ============================================================

import { QuestionType } from './types'

export interface AnswerInput {
  question_key: string
  question_label?: string
  question_type?: QuestionType
  value_text?: string | null
  value_number?: number | null
  value_boolean?: boolean | null
  value_json?: any
  file_id?: string | null
}

export interface QuestionDef {
  key: string
  label: string
  type: QuestionType
  required: boolean
  validation_rules?: any
  options?: Array<{ value: string; label: string }>
}

export function validateAnswer(q: QuestionDef, a: AnswerInput | undefined): string | null {
  const v = a
  const isEmpty =
    !v ||
    (v.value_text == null && v.value_number == null && v.value_boolean == null &&
      (v.value_json == null || (Array.isArray(v.value_json) && v.value_json.length === 0)) &&
      v.file_id == null)

  if (q.required && isEmpty) return `${q.label} is required`
  if (isEmpty) return null

  const rules = q.validation_rules || {}

  switch (q.type) {
    case 'SHORT_TEXT':
    case 'LONG_TEXT':
      if (typeof v!.value_text !== 'string') return `${q.label} must be text`
      if (rules.min_length && v!.value_text.length < rules.min_length) return `${q.label} must be at least ${rules.min_length} characters`
      if (rules.max_length && v!.value_text.length > rules.max_length) return `${q.label} must be at most ${rules.max_length} characters`
      if (rules.pattern) {
        try {
          const re = new RegExp(rules.pattern)
          if (!re.test(v!.value_text)) return `${q.label} does not match required format`
        } catch { /* silent */ }
      }
      return null

    case 'EMAIL':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v!.value_text || ''))) return `${q.label} must be a valid email`
      return null

    case 'PHONE':
      if (!/^[+\d][\d\s\-().]{5,}$/.test(String(v!.value_text || ''))) return `${q.label} must be a valid phone number`
      return null

    case 'URL':
      try {
        new URL(String(v!.value_text || ''))
      } catch {
        return `${q.label} must be a valid URL`
      }
      return null

    case 'NUMBER':
    case 'RATING': {
      const n = v!.value_number ?? Number(v!.value_text)
      if (Number.isNaN(n)) return `${q.label} must be a number`
      if (rules.min != null && n < rules.min) return `${q.label} must be at least ${rules.min}`
      if (rules.max != null && n > rules.max) return `${q.label} must be at most ${rules.max}`
      return null
    }

    case 'DATE':
    case 'TIME':
    case 'DATETIME':
      if (isNaN(Date.parse(String(v!.value_text || '')))) return `${q.label} must be a valid ${q.type.toLowerCase()}`
      return null

    case 'BOOLEAN':
      if (v!.value_boolean !== true && v!.value_boolean !== false) return `${q.label} must be true or false`
      return null

    case 'SINGLE_SELECT':
    case 'DROPDOWN': {
      const val = v!.value_text
      if (q.options && !q.options.some((o) => o.value === val)) return `${q.label} must be one of the provided options`
      return null
    }

    case 'MULTI_SELECT':
    case 'SKILLS': {
      const arr = Array.isArray(v!.value_json) ? v!.value_json : []
      if (q.options && q.options.length > 0) {
        const allowed = new Set(q.options.map((o) => o.value))
        for (const item of arr) if (!allowed.has(item)) return `${q.label} contains an invalid option`
      }
      return null
    }

    case 'FILE':
    case 'IMAGE':
      if (!v!.file_id) return `${q.label} requires an uploaded file`
      return null

    case 'COUNTRY':
    case 'CITY':
      if (typeof v!.value_text !== 'string' || !v!.value_text.trim()) return `${q.label} is required`
      return null

    default:
      return null
  }
}

/**
 * Evaluate whether a question should be shown/required based on rules.
 * Returns effective visibility + required.
 */
export function applyRules(
  questions: QuestionDef[],
  rules: Array<{
    rule_type: 'SHOW_IF' | 'HIDE_IF' | 'REQUIRE_IF'
    target_question_key: string
    condition: any
  }>,
  answers: Record<string, AnswerInput>
) {
  const effective: Record<string, { visible: boolean; required: boolean }> = {}
  for (const q of questions) effective[q.key] = { visible: true, required: q.required }

  for (const rule of rules) {
    const cond = rule.condition || {}
    const ans = answers[cond.question_key]
    const passes = evaluateCondition(ans, cond)
    const target = effective[rule.target_question_key]
    if (!target) continue

    if (rule.rule_type === 'SHOW_IF') target.visible = passes && target.visible
    if (rule.rule_type === 'HIDE_IF' && passes) target.visible = false
    if (rule.rule_type === 'REQUIRE_IF') target.required = target.required || passes
  }

  return effective
}

function evaluateCondition(ans: AnswerInput | undefined, cond: any): boolean {
  const val = ans ? (ans.value_text ?? ans.value_number ?? ans.value_boolean ?? ans.value_json ?? ans.file_id) : null
  switch (cond.operator) {
    case 'EQUALS': return val === cond.value
    case 'NOT_EQUALS': return val !== cond.value
    case 'CONTAINS':
      if (Array.isArray(val)) return val.includes(cond.value)
      if (typeof val === 'string') return val.includes(String(cond.value))
      return false
    case 'GREATER_THAN': return Number(val) > Number(cond.value)
    case 'LESS_THAN': return Number(val) < Number(cond.value)
    case 'IS_TRUTHY': return Boolean(val)
    case 'IS_EMPTY': return val == null || val === '' || (Array.isArray(val) && val.length === 0)
    default: return false
  }
}