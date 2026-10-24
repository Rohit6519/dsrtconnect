// The canonical DB stages (matches CHECK constraint)
export type PipelineStage =
  | 'draft'
  | 'applied'
  | 'submitted'
  | 'pending'
  | 'reviewing'
  | 'screening'
  | 'interviewing'
  | 'offered'
  | 'hired'
  | 'rejected'
  | 'withdrawn'

export type ApplicationStatus =
  | 'draft'
  | 'pending'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'

// Every event the workflow can record
export type WorkflowEventType =
  | 'application_created'
  | 'application_started'
  | 'application_submitted'
  | 'application_viewed_by_owner'
  | 'application_reviewed'
  | 'stage_changed'
  | 'stage_reviewing'
  | 'stage_screening'
  | 'stage_interviewing'
  | 'stage_offered'
  | 'stage_hired'
  | 'stage_rejected'
  | 'application_withdrawn'
  | 'application_reopened'
  | 'note_added'
  | 'reviewer_assigned'
  | 'reviewer_unassigned'
  | 'starred'
  | 'unstarred'
  | 'communication_sent'
  | 'communication_delivered'
  | 'communication_opened'
  | 'communication_replied'
  | 'task_created'
  | 'task_completed'
  | 'interview_scheduled'
  | 'interview_rescheduled'
  | 'interview_cancelled'
  | 'interview_completed'
  | 'offer_created'
  | 'offer_sent'
  | 'offer_accepted'
  | 'offer_declined'

export type WorkflowSource =
  | 'system'
  | 'bulk_action'
  | 'sidebar_chip'
  | 'kanban_drag'
  | 'apply_endpoint'
  | 'submit_endpoint'
  | 'withdraw_endpoint'
  | 'automation'
  | 'api'

export type JobType =
  | 'send_mail_to_candidate'
  | 'send_mail_to_owner'
  | 'notify_owner_in_app'
  | 'notify_candidate_in_app'
  | 'notify_reviewer_in_app'
  | 'refresh_analytics'
  | 'webhook'

export interface TransitionInput {
  application_id: string
  target_stage: PipelineStage
  actor_id: string | null
  source: WorkflowSource
  reason?: string
  metadata?: Record<string, any>
  // Optional overrides for the follow-up automation
  options?: {
    notify_candidate?: boolean          // enqueue candidate mail
    notify_owner?: boolean              // enqueue owner mail
    notify_owner_in_app?: boolean       // in-app notification
    notify_candidate_in_app?: boolean   // in-app notification
    create_task_for?: string            // assignee_id
    reviewer_id?: string                // for reviewer_assigned event linkage
  }
}

export interface TransitionResult {
  ok: boolean
  application_id: string
  from_stage: PipelineStage | null
  to_stage: PipelineStage
  event_id: string
  jobs_queued: string[]
  status: ApplicationStatus
}