# DSRT Platform Kernel

The **Kernel** is the foundation every DSRT domain must build on. It provides
identity, authorization, audit, files, outbox, events, queues, notifications,
and search as a **single coherent operating system** — no domain reimplements
these primitives.

## The Standard Request Pipeline

"""
Every state-changing request in DSRT MUST follow this pipeline:

HTTP Request
↓
Request ID + Trace ID
↓
Rate Limit
↓
Authentication (buildRequestContext / requireAuthContext)
↓
Authorization (checkPermission — Phase 3)
↓
Validation (zod schema)
↓
Domain Service
↓
BEGIN TRANSACTION
├── Mutate domain state
├── writeAudit(tx, ...)
└── writeOutbox(tx, event)
COMMIT
↓
HTTP Response { data, meta: { request_id, event_id } }

║ asynchronously
▼
Outbox Dispatcher (Phase 3)
↓
Event Bus
↓
Consumers (Notifications / Mail / Search / Analytics)


"""



**Never** perform external I/O (email, search index, HTTP calls) inside a DB
transaction. Always emit an outbox event and let workers do the side effects.

## Phase 1 Scope (this ship)

- ✅ Error contract (`errors.ts`)
- ✅ Request context (`context.ts`)
- ✅ Cursor pagination (`pagination.ts`)
- ✅ Standard response envelope (`response.ts`)
- ⏳ Authentication middleware (uses Supabase; formalized in Phase 3)
- ⏳ Authorization engine (Phase 3)
- ⏳ Audit / Outbox / Events / Queue / Notifications / Files / Search (Phases 2–3)

## Rules

1. **Every mutation** goes through the pipeline. No exceptions.
2. **Every API response** uses `ok()` or `fail()` from `response.ts`.
3. **Every list endpoint** uses cursor pagination.
4. **Every critical POST** accepts `Idempotency-Key` header (enforced in Phase 3).
5. **Every mutation** writes an audit log AND an outbox event in the same
   transaction.
6. **Every consumer** is idempotent (deduplicated via
   `kernel.event_consumptions`).
7. **Deny by default.** Explicit permission grants only.

## Usage

```ts
import {
  handler,
  ok,
  requireAuthContext,
  ValidationError,
  NotFoundError,
} from '@/lib/kernel'

export const POST = handler(async ({ req, ctx }) => {
  const authed = await requireAuthContext(req)
  // ... call domain service
  return ok({ id: '...' }, { ctx: authed, eventId: '...' })
})