import {
  EnforcementDecision,
  type PolicyRule,
  type PolicyEvaluationContext,
  type SecurityDecision,
  type ProposedToolAction,
  type AIRiskSignal,
} from '../types/security'
import { v4 as uuidv4 } from 'uuid'
import {
  isToolAllowed,
  isRecipientAllowed,
  isDataCategoryRestricted,
} from './ExecutionContract'

/**
 * Deterministic Policy Engine
 *
 * Makes ALL final enforcement decisions using explicit, deterministic rules.
 *
 * CRITICAL SECURITY PRINCIPLE:
 * AI risk signals are INPUT to the rules — they are not the enforcement decision.
 * The final ALLOW / BLOCK / APPROVAL_REQUIRED is always determined by this engine.
 * An LLM output alone can never permit or deny an action.
 *
 * Rules are evaluated in PRIORITY order (highest first).
 * First matching rule wins.
 * If no rule explicitly allows, DEFAULT_DENY applies.
 */

export const DEFAULT_POLICY_RULES: PolicyRule[] = [
  // ── Priority 100: Hard blocks ──────────────────────────────────────────
  {
    id: 'RULE_001',
    name: 'Block Tool Not In Contract',
    description:
      'Block any tool call not explicitly listed in the execution contract. ' +
      'Tools must be pre-approved in the contract before the session begins.',
    priority: 100,
    condition: (ctx) => !isToolAllowed(ctx.contract, ctx.proposedAction.toolName),
    decision: EnforcementDecision.BLOCK,
  },

  // ── Priority 95: Recipient enforcement ────────────────────────────────
  {
    id: 'RULE_002',
    name: 'Block Unauthorized Email Recipient',
    description:
      'Block send_email_mock to recipients not in the contract allowlist. ' +
      'Prevents exfiltration to unauthorized external addresses.',
    priority: 95,
    condition: (ctx) => {
      if (ctx.proposedAction.toolName !== 'send_email_mock') return false
      const recipient = ctx.proposedAction.parameters['recipient']
      if (typeof recipient !== 'string' || !recipient) return true
      return !isRecipientAllowed(ctx.contract, recipient)
    },
    decision: EnforcementDecision.BLOCK,
  },

  // ── Priority 90: Export enforcement ───────────────────────────────────
  {
    id: 'RULE_003',
    name: 'Block External Export When Prohibited',
    description:
      'Block any external data export when the contract prohibits it. ' +
      'externalExportPermitted must be true in the contract to allow exports.',
    priority: 90,
    condition: (ctx) => {
      if (ctx.contract.externalExportPermitted) return false
      const externalTools = [
        'send_email_mock',
        'http_request',
        'webhook',
        'export_data',
        'upload_file',
      ]
      return externalTools.includes(ctx.proposedAction.toolName)
    },
    decision: EnforcementDecision.BLOCK,
  },

  // ── Priority 85: Taint enforcement ────────────────────────────────────
  {
    id: 'RULE_004',
    name: 'Block Tainted Action Origin',
    description:
      'Block tool actions whose initiating provenance node is marked as tainted. ' +
      'A tainted origin means the action was driven by untrusted or injected content.',
    priority: 85,
    condition: (ctx) => {
      const taintLabel = ctx.taintLabels.find(
        (t) => t.nodeId === ctx.proposedAction.initiatedByNodeId
      )
      return taintLabel?.tainted === true
    },
    decision: EnforcementDecision.BLOCK,
  },

  // ── Priority 80: Data classification ──────────────────────────────────
  {
    id: 'RULE_005',
    name: 'Block Restricted Data Category In Action',
    description:
      'Block actions that contain restricted data category keywords in their parameters. ' +
      'Prevents exfiltration of credentials, PII, financial data, etc.',
    priority: 80,
    condition: (ctx) => {
      const params = ctx.proposedAction.parameters
      const textFields = ['content', 'body', 'data', 'message', 'payload', 'text', 'query']
      return textFields.some((field) => {
        const value = params[field]
        if (typeof value !== 'string') return false
        return isDataCategoryRestricted(ctx.contract, value)
      })
    },
    decision: EnforcementDecision.BLOCK,
  },

  // ── Priority 70: AI-informed approval gate ────────────────────────────
  {
    id: 'RULE_006',
    name: 'Require Approval for High AI Risk Score',
    description:
      'Require human approval when the AI risk signal score is 0.7 or higher. ' +
      'This is a gate — not a block. The user can review and approve.',
    priority: 70,
    condition: (ctx) => {
      return (ctx.aiRiskSignal?.riskScore ?? 0) >= 0.7
    },
    decision: EnforcementDecision.APPROVAL_REQUIRED,
  },

  // ── Priority 60: Injection flag gate ──────────────────────────────────
  {
    id: 'RULE_007',
    name: 'Require Approval for AI Injection Flag',
    description:
      'Require human approval when the AI flags PROMPT_INJECTION or JAILBREAK_ATTEMPT.',
    priority: 60,
    condition: (ctx) => {
      const dangerousFlags = ['PROMPT_INJECTION', 'JAILBREAK_ATTEMPT', 'ROLE_OVERRIDE']
      return (
        (ctx.aiRiskSignal?.flags ?? []).some((f) => dangerousFlags.includes(f)) === true
      )
    },
    decision: EnforcementDecision.APPROVAL_REQUIRED,
  },

  // ── Priority 10: Explicit allow ───────────────────────────────────────
  {
    id: 'RULE_008',
    name: 'Allow Permitted Read Operations',
    description:
      'Allow read_document, search_documents, and read_project_data ' +
      'when they are in the contract and no higher-priority rule blocked them.',
    priority: 10,
    condition: (ctx) => {
      const readTools = ['read_document', 'search_documents', 'read_project_data']
      return (
        readTools.includes(ctx.proposedAction.toolName) &&
        isToolAllowed(ctx.contract, ctx.proposedAction.toolName)
      )
    },
    decision: EnforcementDecision.ALLOW,
  },

  // ── Priority 5: Allowed email with clean source ───────────────────────
  {
    id: 'RULE_009',
    name: 'Allow Permitted Email to Approved Recipient',
    description:
      'Allow send_email_mock when: in contract, recipient is approved, ' +
      'export is permitted, and no higher-priority rule blocked it.',
    priority: 5,
    condition: (ctx) => {
      if (ctx.proposedAction.toolName !== 'send_email_mock') return false
      if (!ctx.contract.externalExportPermitted) return false
      const recipient = ctx.proposedAction.parameters['recipient']
      if (typeof recipient !== 'string') return false
      return isRecipientAllowed(ctx.contract, recipient)
    },
    decision: EnforcementDecision.ALLOW,
  },
]

export class PolicyEngine {
  private rules: PolicyRule[]

  constructor(rules: PolicyRule[] = DEFAULT_POLICY_RULES) {
    // Sort descending by priority — highest priority evaluated first
    this.rules = [...rules].sort((a, b) => b.priority - a.priority)
  }

  evaluate(ctx: PolicyEvaluationContext): SecurityDecision {
    for (const rule of this.rules) {
      let matches = false

      try {
        matches = rule.condition(ctx)
      } catch (err) {
        // Fail-safe: treat evaluation errors as BLOCK
        return this.buildDecision(
          ctx.proposedAction,
          EnforcementDecision.BLOCK,
          rule.id,
          `Policy rule evaluation error (fail-safe block): ${String(err)}`,
          ctx.aiRiskSignal
        )
      }

      if (matches) {
        return this.buildDecision(
          ctx.proposedAction,
          rule.decision,
          rule.id,
          `${rule.name}: ${rule.description}`,
          ctx.aiRiskSignal
        )
      }
    }

    // Default deny — no rule explicitly permitted the action
    return this.buildDecision(
      ctx.proposedAction,
      EnforcementDecision.BLOCK,
      'DEFAULT_DENY',
      'No policy rule explicitly permitted this action. Default-deny applied.',
      ctx.aiRiskSignal
    )
  }

  private buildDecision(
    action: ProposedToolAction,
    decision: EnforcementDecision,
    ruleId: string,
    reasoning: string,
    aiRiskSignal?: AIRiskSignal
  ): SecurityDecision {
    return {
      id: uuidv4(),
      sessionId: action.sessionId,
      proposedAction: action,
      decision,
      policyRuleTriggered: ruleId,
      aiRiskSignal,
      reasoning,
      timestamp: Date.now(),
      userId: '', // set by caller
    }
  }

  getRules(): PolicyRule[] {
    return [...this.rules]
  }

  getRuleById(id: string): PolicyRule | undefined {
    return this.rules.find((r) => r.id === id)
  }
}
