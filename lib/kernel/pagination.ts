// ============================================================
// lib/kernel/pagination.ts
// Cursor pagination — the ONLY pagination style in DSRT.
// Never use offset/page-number pagination.
// ============================================================

import { z } from 'zod'

export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100

export const CursorParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .coerce.number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
})

export type CursorParams = z.infer<typeof CursorParamsSchema>

export interface CursorPage<T> {
  items: T[]
  next_cursor: string | null
  has_more: boolean
}

/**
 * Encode a cursor from ordering key(s) — typically (created_at, id).
 */
export function encodeCursor(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload)
  return Buffer.from(json, 'utf-8').toString('base64url')
}

/**
 * Decode a cursor back into its payload. Returns null on invalid input.
 */
export function decodeCursor<T = Record<string, unknown>>(
  cursor: string | undefined | null
): T | null {
  if (!cursor) return null
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8')
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

/**
 * Parse cursor params from a URL query string.
 */
export function parseCursorParams(searchParams: URLSearchParams): CursorParams {
  return CursorParamsSchema.parse({
    cursor: searchParams.get('cursor') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })
}

/**
 * Slice results to page size and produce next cursor from the last item.
 * Fetch (limit + 1) rows from the DB; this helper handles the rest.
 */
export function buildCursorPage<T>(
  rows: T[],
  limit: number,
  getCursor: (row: T) => Record<string, unknown>
): CursorPage<T> {
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const last = items[items.length - 1]
  return {
    items,
    next_cursor: hasMore && last ? encodeCursor(getCursor(last)) : null,
    has_more: hasMore,
  }
}