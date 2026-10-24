// ============================================================
// lib/kernel/errors.ts
// Standard error contract for DSRT platform.
// Every API error MUST be an instance of KernelError or subclass.
// ============================================================

export type ErrorCode =
  // Authentication & Authorization
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'INVALID_SESSION'
  | 'MFA_REQUIRED'
  // Validation
  | 'VALIDATION_ERROR'
  | 'INVALID_INPUT'
  | 'MISSING_REQUIRED_FIELD'
  // Resource
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'GONE'
  // State
  | 'INVALID_STATE_TRANSITION'
  | 'STATE_CONFLICT'
  | 'PRECONDITION_FAILED'
  // Rate / Concurrency
  | 'RATE_LIMITED'
  | 'CONCURRENT_MODIFICATION'
  | 'IDEMPOTENCY_CONFLICT'
  // Community domain
  | 'COMMUNITY_NOT_FOUND'
  | 'COMMUNITY_NOT_ACTIVE'
  | 'COMMUNITY_ARCHIVED'
  | 'NOT_A_MEMBER'
  | 'MEMBERSHIP_SUSPENDED'
  | 'MEMBERSHIP_BANNED'
  | 'INSUFFICIENT_PERMISSION'
  | 'APPLICATION_ALREADY_EXISTS'
  | 'APPLICATION_INVALID_STATE'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_REVOKED'
  | 'INVITATION_ALREADY_USED'
  | 'JOIN_POLICY_VIOLATION'
  // Content
  | 'POST_NOT_FOUND'
  | 'POST_NOT_EDITABLE'
  | 'POLL_CLOSED'
  | 'ALREADY_VOTED'
  | 'RESOURCE_NOT_AVAILABLE'
  // Events
  | 'EVENT_CANCELLED'
  | 'EVENT_ENDED'
  | 'REGISTRATION_CLOSED'
  | 'CAPACITY_REACHED'
  | 'ALREADY_REGISTERED'
  | 'ALREADY_CHECKED_IN'
  // System
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'DOWNSTREAM_ERROR'

export interface FieldError {
  field: string
  message: string
  code?: string
}

export interface ErrorEnvelope {
  error: {
    code: ErrorCode
    message: string
    request_id?: string
    field_errors?: FieldError[]
    details?: Record<string, unknown>
  }
}

export class KernelError extends Error {
  code: ErrorCode
  httpStatus: number
  fieldErrors?: FieldError[]
  details?: Record<string, unknown>
  requestId?: string

  constructor(
    code: ErrorCode,
    message: string,
    opts?: {
      httpStatus?: number
      fieldErrors?: FieldError[]
      details?: Record<string, unknown>
      requestId?: string
    }
  ) {
    super(message)
    this.name = 'KernelError'
    this.code = code
    this.httpStatus = opts?.httpStatus ?? httpStatusForCode(code)
    this.fieldErrors = opts?.fieldErrors
    this.details = opts?.details
    this.requestId = opts?.requestId
  }

  toEnvelope(): ErrorEnvelope {
    return {
      error: {
        code: this.code,
        message: this.message,
        request_id: this.requestId,
        field_errors: this.fieldErrors,
        details: this.details,
      },
    }
  }
}

export class ValidationError extends KernelError {
  constructor(fieldErrors: FieldError[], message = 'Validation failed') {
    super('VALIDATION_ERROR', message, {
      httpStatus: 422,
      fieldErrors,
    })
  }
}

export class NotFoundError extends KernelError {
  constructor(resource: string, id?: string) {
    super('NOT_FOUND', `${resource}${id ? ` (${id})` : ''} not found`, {
      httpStatus: 404,
    })
  }
}

export class ForbiddenError extends KernelError {
  constructor(reason = 'You do not have permission to perform this action') {
    super('FORBIDDEN', reason, { httpStatus: 403 })
  }
}

export class UnauthenticatedError extends KernelError {
  constructor(reason = 'Authentication required') {
    super('UNAUTHENTICATED', reason, { httpStatus: 401 })
  }
}

export class RateLimitError extends KernelError {
  constructor(retryAfterSeconds?: number) {
    super('RATE_LIMITED', 'Too many requests', {
      httpStatus: 429,
      details: retryAfterSeconds ? { retry_after: retryAfterSeconds } : undefined,
    })
  }
}

export class StateConflictError extends KernelError {
  constructor(
    message: string,
    details?: { current_state?: string; requested_transition?: string }
  ) {
    super('INVALID_STATE_TRANSITION', message, {
      httpStatus: 409,
      details,
    })
  }
}

function httpStatusForCode(code: ErrorCode): number {
  switch (code) {
    case 'UNAUTHENTICATED':
    case 'INVALID_SESSION':
      return 401
    case 'MFA_REQUIRED':
      return 401
    case 'FORBIDDEN':
    case 'INSUFFICIENT_PERMISSION':
    case 'MEMBERSHIP_BANNED':
    case 'MEMBERSHIP_SUSPENDED':
      return 403
    case 'NOT_FOUND':
    case 'COMMUNITY_NOT_FOUND':
    case 'POST_NOT_FOUND':
    case 'RESOURCE_NOT_AVAILABLE':
      return 404
    case 'GONE':
      return 410
    case 'VALIDATION_ERROR':
    case 'INVALID_INPUT':
    case 'MISSING_REQUIRED_FIELD':
      return 422
    case 'RATE_LIMITED':
      return 429
    case 'ALREADY_EXISTS':
    case 'INVALID_STATE_TRANSITION':
    case 'STATE_CONFLICT':
    case 'CONCURRENT_MODIFICATION':
    case 'IDEMPOTENCY_CONFLICT':
    case 'APPLICATION_ALREADY_EXISTS':
    case 'ALREADY_REGISTERED':
    case 'ALREADY_CHECKED_IN':
    case 'ALREADY_VOTED':
    case 'CAPACITY_REACHED':
      return 409
    case 'PRECONDITION_FAILED':
      return 412
    case 'SERVICE_UNAVAILABLE':
      return 503
    case 'DOWNSTREAM_ERROR':
      return 502
    default:
      return 400
  }
}

/**
 * Wrap any thrown error into a KernelError for uniform API responses.
 */
export function toKernelError(err: unknown, requestId?: string): KernelError {
  if (err instanceof KernelError) {
    if (requestId && !err.requestId) err.requestId = requestId
    return err
  }
  if (err instanceof Error) {
    return new KernelError('INTERNAL_ERROR', err.message, {
      httpStatus: 500,
      requestId,
    })
  }
  return new KernelError('INTERNAL_ERROR', 'Unknown error', {
    httpStatus: 500,
    requestId,
  })
}