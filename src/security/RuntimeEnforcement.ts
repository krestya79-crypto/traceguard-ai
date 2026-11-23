import { v4 as uuidv4 } from 'uuid'
import {
  EnforcementDecision,
  type ProposedToolAction,
  type ExecutionContract,
  type SecurityDecision,
} from '../types/security'
import { PolicyEngine, DEFAULT_POLICY_RULES } from './PolicyEngine'
import type { TaintEngine } from './TaintEngine'
import type { ProvenanceTracker } from './ProvenanceTracker'
import { analyzeInstruction } from '../firebase/ai'
import { recordSecurityDecision, recordSecurityEvent } from '../firebase/firestore'

/**
 * Runtime Enforcement Layer
 *
 * Orchestration order for every proposed tool action:
 *   1. Gather provenance chain for the initiating node
 *   2. Collect current taint labels
 *   3. Run AI risk analysis (async, non-blocking on failure)
 *   4. Run deterministic PolicyEngine evaluation (FINAL DECISION)
 *   5. Persist decision and events to Firestore
 *
 * The final ALLOW / BLOCK / APPROVAL_REQUIRED decision is ALWAYS made
 * by the PolicyEngine. AI analysis informs rules but cannot override them.
 */
export class RuntimeEnforcement {
  private policyEngine: PolicyEngine

  constructor(
    private provenance: ProvenanceTracker,
    private taintEngine: TaintEngine,
    policyEngine?: PolicyEngine
  ) {
    this.policyEngine = policyEngine ?? new PolicyEngine(DEFAULT_POLICY_RULES)
  }

  async evaluate(
    action: ProposedToolAction,
    contract: ExecutionContract,
    userId: string
  ): Promise<SecurityDecision> {
    // 1. Provenance chain for the initiating node
    const provenanceChain = this.provenance.getChain(action.initiatedByNodeId)

    // 2. Current taint labels from the engine
    const taintLabels = this.taintEngine.getAllTaintLabels()

    // 3. AI risk signal — non-blocking, fails gracefully
    let aiRiskSignal = undefined
    try {
      const initiatingNode = this.provenance.getNode(action.initiatedByNodeId)
      if (initiatingNode) {
        aiRiskSignal = await analyzeInstruction(
          `Tool: ${action.toolName}\nParameters: ${JSON.stringify(action.parameters, null, 2)}`,
          `Agent goal: ${contract.userGoal}\nNode source: ${initiatingNode.source}\nTrust: ${initiatingNode.trustLevel}`
        )
      }
    } catch (err) {
      console.warn(
        '[RuntimeEnforcement] AI analysis unavailable — proceeding with deterministic rules only:',
        err
      )
    }

    // 4. Deterministic policy evaluation — FINAL DECISION
    const decision = this.policyEngine.evaluate({
      proposedAction: action,
      contract,
      taintLabels,
      provenanceChain,
      aiRiskSignal,
    })

    decision.userId = userId

    // 5. Persist to Firestore (errors here do NOT affect enforcement)
    this.persistDecision(decision, action, userId).catch((err) => {
      console.error('[RuntimeEnforcement] Firestore persistence error:', err)
    })

    return decision
  }

  private async persistDecision(
    decision: SecurityDecision,
    action: ProposedToolAction,
    userId: string
  ): Promise<void> {
    await recordSecurityDecision({
      sessionId: decision.sessionId,
      proposedAction: action as unknown as Record<string, unknown>,
      decision: decision.decision,
      policyRuleTriggered: decision.policyRuleTriggered,
      aiRiskSignal: decision.aiRiskSignal as unknown as Record<string, unknown> | undefined,
      reasoning: decision.reasoning,
      timestamp: decision.timestamp,
      userId,
    })

    // Record a security event for notable decisions
    if (decision.decision === EnforcementDecision.BLOCK) {
      await recordSecurityEvent({
        sessionId: action.sessionId,
        type: 'TOOL_BLOCKED',
        severity: 'HIGH',
        description: `Tool '${action.toolName}' BLOCKED. Rule: ${decision.policyRuleTriggered}. ${decision.reasoning}`,
        nodeId: action.initiatedByNodeId,
        timestamp: Date.now(),
        userId,
      })
    } else if (decision.decision === EnforcementDecision.APPROVAL_REQUIRED) {
      await recordSecurityEvent({
        sessionId: action.sessionId,
        type: 'POLICY_VIOLATION',
        severity: 'MEDIUM',
        description: `Tool '${action.toolName}' requires approval. Rule: ${decision.policyRuleTriggered}.`,
        nodeId: action.initiatedByNodeId,
        timestamp: Date.now(),
        userId,
      })
    }
  }
}

/**
 * Build a ProposedToolAction object (convenience factory).
 */
export function buildToolAction(params: {
  toolName: string
  parameters: Record<string, unknown>
  initiatedByNodeId: string
  sessionId: string
}): ProposedToolAction {
  return {
    id: uuidv4(),
    toolName: params.toolName,
    parameters: params.parameters,
    initiatedByNodeId: params.initiatedByNodeId,
    sessionId: params.sessionId,
    timestamp: Date.now(),
  }
}
