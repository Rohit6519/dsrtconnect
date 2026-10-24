// ============================================================
// lib/coco/agent/runtime.ts
// The Core COCO Orchestrator.
// Streams model responses, handles tools, manages risk boundaries.
// ============================================================

import { randomUUID } from 'crypto'
import type {
  CocoContextEnvelope,
  CocoMessage,
  CocoStreamEvent,
  CocoModelRequest,
  CocoModelMessage,
  CocoToolCall,
  CocoTaskClass,
} from '@/types/coco'

import { streamModelRequest } from '@/lib/coco/gateway'
import { getActiveToolsForUser, formatToolsForModel, executeTool } from '@/lib/coco/tools'
import { evaluateConfirmationRequirement } from '@/lib/coco/permissions/risk'
import { createActionRun } from '@/lib/coco/actions/manager'
import { buildSystemPrompt } from './prompt'

export interface RunAgentParams {
  userId: string
  conversationId: string
  requestId: string
  userMessage: string
  history: CocoMessage[]
  context: CocoContextEnvelope
  taskClass: CocoTaskClass
}

export async function* runAgentTurn(params: RunAgentParams): AsyncGenerator<CocoStreamEvent> {
  const { userId, conversationId, requestId, userMessage, history, context, taskClass } = params

  // 1. Prepare Tools
  const activeTools = await getActiveToolsForUser(context.permissions)
  const modelTools = formatToolsForModel(activeTools)

  // 2. Prepare Messages
  const messages: CocoModelMessage[] = [
    { role: 'system', content: buildSystemPrompt(context) },
  ]

  const recentHistory = history.slice(-10).map((m) => ({
    role: m.role as any,
    content: m.content.kind === 'text' ? m.content.text : JSON.stringify(m.content),
  }))
  messages.push(...recentHistory)
  messages.push({ role: 'user', content: userMessage })

  const assistantMessageId = randomUUID()

  yield {
    event: 'stream.start',
    request_id: requestId,
    timestamp: new Date().toISOString(),
    data: { conversation_id: conversationId, assistant_message_id: assistantMessageId },
  }

  // Agent Loop — max 3 iterations (prevent infinite tool loops)
  let iterations = 0
  const MAX_ITERATIONS = 3

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const tier =
      taskClass === 'E_AGENTIC' || taskClass === 'D_REASONING' ? 'REASONING' : 'GENERAL'

    const req: CocoModelRequest = {
      tier,
      task_class: taskClass,
      user_id: userId,
      conversation_id: conversationId,
      request_id: requestId,
      messages,
      tools: modelTools.length > 0 ? modelTools : undefined,
    }

    const stream = streamModelRequest(req)
    let fullText = ''
    const pendingToolCalls = new Map<string, { name: string; args: string }>()

    // 3. Stream from Gateway to Client
    for await (const chunk of stream) {
      if (chunk.kind === 'text') {
        fullText += chunk.delta
        yield {
          event: 'message.delta',
          request_id: requestId,
          timestamp: new Date().toISOString(),
          data: { text: chunk.delta },
        }
      } else if (chunk.kind === 'tool_call_delta') {
        const current = pendingToolCalls.get(chunk.call_id) || { name: '', args: '' }
        if (chunk.tool_name) current.name = chunk.tool_name
        if (chunk.arguments_delta) current.args += chunk.arguments_delta
        pendingToolCalls.set(chunk.call_id, current)
      } else if (chunk.kind === 'error') {
        yield {
          event: 'error',
          request_id: requestId,
          timestamp: new Date().toISOString(),
          data: { code: chunk.code, message: chunk.message },
        }
        return
      }
    }

    if (fullText || pendingToolCalls.size > 0) {
      messages.push({
        role: 'assistant',
        content: fullText,
      })
    }

    // 4. No tools → done
    if (pendingToolCalls.size === 0) {
      yield {
        event: 'message.completed',
        request_id: requestId,
        timestamp: new Date().toISOString(),
        data: {
          assistant_message_id: assistantMessageId,
          content: { kind: 'text', text: fullText },
        },
      }
      break
    }

    // 5. Process tool calls
    let toolsHandled = 0
    for (const [callId, tc] of pendingToolCalls.entries()) {
      yield {
        event: 'tool.started',
        request_id: requestId,
        timestamp: new Date().toISOString(),
        data: { call_id: callId, tool_name: tc.name },
      }

      const toolDef = activeTools.find((t) => t.name === tc.name)
      if (!toolDef) {
        messages.push({
          role: 'tool',
          tool_call_id: callId,
          name: tc.name,
          content: 'Error: Tool not found',
        })
        continue
      }

      let parsedArgs: Record<string, unknown> = {}
      try {
        parsedArgs = JSON.parse(tc.args)
      } catch {
        // validator will catch empty/invalid args
      }

      const toolCallObj: CocoToolCall = {
        call_id: callId,
        tool_name: tc.name,
        tool_version: toolDef.version,
        arguments: parsedArgs,
      }

      // Risk evaluation
      const riskEval = evaluateConfirmationRequirement(
        toolDef.risk_level,
        toolDef.confirmation_policy,
        {
          user_id: userId,
          scopes: context.permissions,
          auto_confirm_r2: true,
          proactive_enabled: false,
        }
      )

      // 6. Action run initialization with DB safety fallbacks
      let actionRunId: string = randomUUID()
      const actionSummary = tc.name === 'navigate.to'
        ? `Navigate to ${String((parsedArgs as any).route || 'page')}`
        : `Execute ${tc.name}`

      try {
        actionRunId = await createActionRun({
          userId,
          conversationId,
          messageId: null, // FK safe, do not pass unpersisted client-side UUIDs
          toolCall: toolCallObj,
          toolVersion: toolDef.version,
          riskLevel: toolDef.risk_level,
          requiresConfirmation: riskEval.requires_confirmation,
          summary: actionSummary,
        })
      } catch (err: any) {
        console.error('[COCO] createActionRun failed (continuing tool exec):', err?.message)
        // If high-risk requires confirmation but record initialization failed, abort to preserve boundary rules
        if (riskEval.requires_confirmation) {
          yield {
            event: 'error',
            request_id: requestId,
            timestamp: new Date().toISOString(),
            data: {
              code: 'COCO_ACTION_CREATE_FAILED',
              message: err?.message || 'Could not create action run record for confirmation workflow',
            },
          }
          yield {
            event: 'stream.end',
            request_id: requestId,
            timestamp: new Date().toISOString(),
            data: { reason: 'error' },
          }
          return
        }
      }

      // HIGH RISK → pause execution loop and await user confirmation
      if (riskEval.requires_confirmation) {
        yield {
          event: 'action.proposed',
          request_id: requestId,
          timestamp: new Date().toISOString(),
          data: {
            action_run_id: actionRunId,
            tool_name: tc.name,
            summary: actionSummary,
            requires_confirmation: true,
          },
        }
        yield {
          event: 'action.confirmation_required',
          request_id: requestId,
          timestamp: new Date().toISOString(),
          data: { action_run_id: actionRunId },
        }
        yield {
          event: 'stream.end',
          request_id: requestId,
          timestamp: new Date().toISOString(),
          data: { reason: 'completed' },
        }
        return
      }

      // LOW RISK → execute immediately
      const result = await executeTool({
        userId,
        conversationId,
        toolCall: toolCallObj,
        userScopes: context.permissions,
        requestId,
      })

      yield {
        event: 'action.completed',
        request_id: requestId,
        timestamp: new Date().toISOString(),
        data: { action_run_id: actionRunId, verified: !!result.verified },
      }

      // ACTION BRIDGE: forward client-side events directly to client viewport via streaming events
      if (
        result.success &&
        result.output &&
        typeof result.output === 'object' &&
        (result.output as any).action
      ) {
        yield {
          event: 'action.client_bridge',
          request_id: requestId,
          timestamp: new Date().toISOString(),
          data: { output: result.output },
        }
      }

      yield {
        event: 'tool.completed',
        request_id: requestId,
        timestamp: new Date().toISOString(),
        data: { call_id: callId, tool_name: tc.name, success: result.success },
      }

      messages.push({
        role: 'tool',
        tool_call_id: callId,
        name: tc.name,
        content: JSON.stringify(result.success ? result.output : result.error),
      })
      toolsHandled++
    }

    if (toolsHandled > 0) {
      continue // loop so model can process and summarize tool output results
    } else {
      break
    }
  }

  yield {
    event: 'stream.end',
    request_id: requestId,
    timestamp: new Date().toISOString(),
    data: { reason: 'completed' },
  }
}