import { describe, it, expect, beforeEach } from 'vitest'
import { PolicyEngine, DEFAULT_POLICY_RULES } from '../src/security/PolicyEngine'
import {
  EnforcementDecision,
  InferenceRoute,
  type ProposedToolAction,
  type ExecutionContract,
} from '../src/types/security'
import { createContract } from '../src/security/ExecutionContract'
import { v4 as uuidv4 } from 'uuid'

function createSampleAction(overrides: Partial<ProposedToolAction> = {}): ProposedToolAction {
  return {
    id: uuidv4(),
    toolName: 'read_document',
    parameters: { documentId: 'sample_doc' },
    initiatedByNodeId: 'node_1',
    sessionId: 'session_1',
    timestamp: Date.now(),
    ...overrides,
  }
}

function createSampleContract(overrides: Partial<ExecutionContract> = {}): Readonly<ExecutionContract> {
  const base = createContract({
    userId: 'user_123',
    sessionId: 'session_1',
    userGoal: 'Summarize quarterly engineering updates',
    allowedTools: ['read_document', 'search_documents', 'read_project_data'],
    allowedRecipients: ['manager@company.com'],
    restrictedDataCategories: ['credentials', 'pii', 'financial'],
    externalExportPermitted: false,
  })
  return Object.freeze({ ...base, ...overrides })
}

describe('Deterministic PolicyEngine Verification', () => {
  let engine: PolicyEngine

  beforeEach(() => {
    engine = new PolicyEngine(DEFAULT_POLICY_RULES)
  })

  it('RULE_001: BLOCKS tools that are not listed in the execution contract', () => {
    const action = createSampleAction({ toolName: 'unauthorized_shell_exec' })
    const contract = createSampleContract({ allowedTools: ['read_document'] })

    const decision = engine.evaluate({
      proposedAction: action,
      contract,
      taintLabels: [],
      provenanceChain: [],
    })

    expect(decision.decision).toBe(EnforcementDecision.BLOCK)
    expect(decision.policyRuleTriggered).toBe('RULE_001')
  })

  it('RULE_002: BLOCKS send_email_mock when recipient is not in contract allowlist', () => {
    const action = createSampleAction({
      toolName: 'send_email_mock',
      parameters: {
        recipient: 'hacker@darkweb.org',
        subject: 'Exfiltrated Data',
        body: 'Here is everything',
      },
    })
    const contract = createSampleContract({
      allowedTools: ['send_email_mock'],
      allowedRecipients: ['manager@company.com'],
      externalExportPermitted: true,
    })

    const decision = engine.evaluate({
      proposedAction: action,
      contract,
      taintLabels: [],
      provenanceChain: [],
    })

    expect(decision.decision).toBe(EnforcementDecision.BLOCK)
    expect(decision.policyRuleTriggered).toBe('RULE_002')
  })

  it('RULE_003: BLOCKS external export when prohibited in execution contract', () => {
    const action = createSampleAction({
      toolName: 'send_email_mock',
      parameters: {
        recipient: 'manager@company.com',
        subject: 'Legit email',
        body: 'Safe report',
      },
    })
    const contract = createSampleContract({
      allowedTools: ['send_email_mock'],
      allowedRecipients: ['manager@company.com'],
      externalExportPermitted: false, // Prohibited!
    })

    const decision = engine.evaluate({
      proposedAction: action,
      contract,
      taintLabels: [],
      provenanceChain: [],
    })

    expect(decision.decision).toBe(EnforcementDecision.BLOCK)
    expect(decision.policyRuleTriggered).toBe('RULE_003')
  })

  it('RULE_004: BLOCKS tool action whose initiating provenance node is tainted', () => {
    const taintedNodeId = 'tainted_node_99'
    const action = createSampleAction({
      toolName: 'read_document',
      initiatedByNodeId: taintedNodeId,
    })
    const contract = createSampleContract()

    const decision = engine.evaluate({
      proposedAction: action,
      contract,
      taintLabels: [
        {
          nodeId: taintedNodeId,
          tainted: true,
          taintReason: 'UNTRUSTED_EXTERNAL_SOURCE',
        },
      ],
      provenanceChain: [],
    })

    expect(decision.decision).toBe(EnforcementDecision.BLOCK)
    expect(decision.policyRuleTriggered).toBe('RULE_004')
  })

  it('RULE_005: BLOCKS actions attempting to transmit restricted data categories', () => {
    const action = createSampleAction({
      toolName: 'read_document',
      parameters: {
        documentId: 'doc_1',
        message: 'Looking up credentials and bank financial records',
      },
    })
    const contract = createSampleContract()

    const decision = engine.evaluate({
      proposedAction: action,
      contract,
      taintLabels: [],
      provenanceChain: [],
    })

    expect(decision.decision).toBe(EnforcementDecision.BLOCK)
    expect(decision.policyRuleTriggered).toBe('RULE_005')
  })

  it('RULE_006: Requires APPROVAL_REQUIRED when AI risk score exceeds 0.7 threshold', () => {
    const action = createSampleAction({
      toolName: 'read_document',
      parameters: { documentId: 'public_whitepaper' },
    })
    const contract = createSampleContract()

    const decision = engine.evaluate({
      proposedAction: action,
      contract,
      taintLabels: [],
      provenanceChain: [],
      aiRiskSignal: {
        riskScore: 0.85,
        flags: ['ANOMALOUS_PATTERN'],
        reasoning: 'Unusual query timing detected by analysis model',
        inferenceRoute: InferenceRoute.ON_DEVICE,
        modelUsed: 'gemini-nano',
        analysisType: 'ON_DEVICE_ANALYSIS',
      },
    })

    expect(decision.decision).toBe(EnforcementDecision.APPROVAL_REQUIRED)
    expect(decision.policyRuleTriggered).toBe('RULE_006')
  })

  it('RULE_008: ALLOWS compliant read operations with clean provenance', () => {
    const action = createSampleAction({
      toolName: 'read_document',
      parameters: { documentId: 'internal_team_handbook' },
      initiatedByNodeId: 'clean_node_1',
    })
    const contract = createSampleContract()

    const decision = engine.evaluate({
      proposedAction: action,
      contract,
      taintLabels: [
        {
          nodeId: 'clean_node_1',
          tainted: false,
        },
      ],
      provenanceChain: [],
      aiRiskSignal: {
        riskScore: 0.05,
        flags: ['BENIGN'],
        reasoning: 'Normal documentation read',
        inferenceRoute: InferenceRoute.ON_DEVICE,
        modelUsed: 'gemini-nano',
        analysisType: 'ON_DEVICE_ANALYSIS',
      },
    })

    expect(decision.decision).toBe(EnforcementDecision.ALLOW)
    expect(decision.policyRuleTriggered).toBe('RULE_008')
  })

  it('DEFAULT DENY: Blocks when no explicit rule matches', () => {
    // Empty rule engine to test default deny fallback
    const strictEngine = new PolicyEngine([])
    const action = createSampleAction()
    const contract = createSampleContract()

    const decision = strictEngine.evaluate({
      proposedAction: action,
      contract,
      taintLabels: [],
      provenanceChain: [],
    })

    expect(decision.decision).toBe(EnforcementDecision.BLOCK)
    expect(decision.policyRuleTriggered).toBe('DEFAULT_DENY')
  })
})
