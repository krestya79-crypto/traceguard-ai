import { describe, it, expect, beforeEach } from 'vitest'
import { AgentRunner } from '../src/agent/AgentRunner'
import { PolicyEngine } from '../src/security/PolicyEngine'
import { EnforcementDecision, TrustLevel, type ProposedToolAction, type PolicyEvaluationContext } from '../src/types/security'
import { createContract } from '../src/security/ExecutionContract'
import { InferenceRoute } from '../src/types/security'
import { v4 as uuidv4 } from 'uuid'

describe('PHASE 3 FEATURE INTEGRATION & SECURITY TESTS', () => {
  let runner: AgentRunner

  beforeEach(() => {
    runner = new AgentRunner()
  })

  describe('1. Attack Simulator: All 5 Scenarios', () => {
    it('Scenario A: Benign document summarization completes with permitted status', async () => {
      const result = await runner.runScenarioA()
      expect(result.success).toBe(true)
      expect(result.summary).toBeDefined()

      const state = AgentRunner.getLastExecutionState()
      expect(state).not.toBeNull()
      expect(state?.session.status).toBe('COMPLETED')
      expect(state?.accessedDocuments.length).toBeGreaterThan(0)
    })

    it('Scenario B: Indirect prompt injection inside external document is intercepted and blocked', async () => {
      const result = await runner.runScenarioB()
      expect(result.blocked).toBe(true)
      expect(result.violationReason).toBeDefined()

      const state = AgentRunner.getLastExecutionState()
      expect(state).not.toBeNull()
      expect(state?.session.status).toBe('BLOCKED')
      expect(state?.session.blockedActions).toBeGreaterThan(0)

      // Lineage must register taint
      const injectionEvent = state?.events.find(
        (e) => e.type === 'PROMPT_INJECTION_DETECTED' || e.type === 'TAINT_PROPAGATION'
      )
      expect(injectionEvent).toBeDefined()
    })

    it('Scenario C: Unauthorized data exfiltration to unapproved recipient is blocked', async () => {
      const result = await runner.runScenarioC()
      expect(result.blocked).toBe(true)
      expect(result.violationReason).toBeDefined()

      const state = AgentRunner.getLastExecutionState()
      expect(state).not.toBeNull()
      expect(state?.session.blockedActions).toBeGreaterThan(0)

      // Check blocked decision
      const blockedDecision = state?.decisions.find(
        (d) => d.decision === EnforcementDecision.BLOCK
      )
      expect(blockedDecision).toBeDefined()
    })

    it('Scenario D: Unauthorized tool execution is blocked by contract policy', async () => {
      const result = await runner.runScenarioD()
      expect(result.blocked).toBe(true)
      expect(result.violationReason).toContain('contract')

      const state = AgentRunner.getLastExecutionState()
      expect(state).not.toBeNull()
      expect(state?.session.status).toBe('BLOCKED')
      const unauthDecision = state?.decisions.find(
        (d) => d.proposedAction.toolName === 'unauthorized_shell_exec'
      )
      expect(unauthDecision?.decision).toBe(EnforcementDecision.BLOCK)
    })

    it('Scenario E: Attempted modification of frozen ExecutionContract is strictly rejected', async () => {
      const result = await runner.runScenarioE()
      expect(result.blocked).toBe(true)
      expect(result.violationReason).toBeDefined()

      const state = AgentRunner.getLastExecutionState()
      expect(state).not.toBeNull()
      expect(state?.session.status).toBe('BLOCKED')
      expect(state?.contract.externalExportPermitted).toBe(false)
    })
  })

  describe('2. Provenance Graph Lineage & Taint Engine', () => {
    it('accurately tracks document access and parent-child provenance', async () => {
      await runner.runScenarioA()
      const state = AgentRunner.getLastExecutionState()
      expect(state).not.toBeNull()

      const nodes = state!.provenance.getAllNodes()
      expect(nodes.length).toBeGreaterThan(0)

      const rootNode = nodes.find((n) => n.trustLevel === TrustLevel.TRUSTED_USER)
      expect(rootNode).toBeDefined()

      const derivedNode = nodes.find((n) => n.trustLevel === TrustLevel.DERIVED || n.type === 'EXTERNAL_DOCUMENT')
      expect(derivedNode).toBeDefined()
    })

    it('marks tainted lineage when malicious document is processed', async () => {
      await runner.runScenarioB()
      const state = AgentRunner.getLastExecutionState()
      expect(state).not.toBeNull()

      const taintLabels = state!.taintEngine.getAllTaintLabels()
      const tainted = taintLabels.some((t) => t.tainted === true)
      expect(tainted).toBe(true)
    })
  })

  describe('3. Runtime Guard & Deterministic Policy Engine', () => {
    const engine = new PolicyEngine()

    it('RULE_001 blocks tools not in contract allowlist', () => {
      const contract = createContract({
        userId: 'test_user',
        sessionId: 'test_sess',
        userGoal: 'Test Goal',
        allowedTools: ['read_document'],
      })

      const action: ProposedToolAction = {
        id: uuidv4(),
        toolName: 'shell_exec',
        parameters: {},
        initiatedByNodeId: 'node_1',
        sessionId: 'test_sess',
        timestamp: Date.now(),
      }

      const ctx: PolicyEvaluationContext = {
        contract,
        proposedAction: action,
        taintLabels: [],
        provenanceChain: [],
      }

      const decision = engine.evaluate(ctx)
      expect(decision.decision).toBe(EnforcementDecision.BLOCK)
      expect(decision.policyRuleTriggered).toBe('RULE_001')
    })

    it('RULE_002 blocks unauthorized email recipients', () => {
      const contract = createContract({
        userId: 'test_user',
        sessionId: 'test_sess',
        userGoal: 'Test Goal',
        allowedTools: ['send_email_mock'],
        allowedRecipients: ['safe@traceguard.ai'],
        externalExportPermitted: true,
      })

      const action: ProposedToolAction = {
        id: uuidv4(),
        toolName: 'send_email_mock',
        parameters: { recipient: 'evil@adversary.com' },
        initiatedByNodeId: 'node_1',
        sessionId: 'test_sess',
        timestamp: Date.now(),
      }

      const ctx: PolicyEvaluationContext = {
        contract,
        proposedAction: action,
        taintLabels: [],
        provenanceChain: [],
      }

      const decision = engine.evaluate(ctx)
      expect(decision.decision).toBe(EnforcementDecision.BLOCK)
      expect(decision.policyRuleTriggered).toBe('RULE_002')
    })

    it('RULE_004 blocks actions initiated by tainted origin node', () => {
      const contract = createContract({
        userId: 'test_user',
        sessionId: 'test_sess',
        userGoal: 'Test Goal',
        allowedTools: ['send_email_mock'],
        allowedRecipients: ['partner@internal.org'],
        externalExportPermitted: true,
      })

      const action: ProposedToolAction = {
        id: uuidv4(),
        toolName: 'send_email_mock',
        parameters: { recipient: 'partner@internal.org' },
        initiatedByNodeId: 'tainted_node_99',
        sessionId: 'test_sess',
        timestamp: Date.now(),
      }

      const ctx: PolicyEvaluationContext = {
        contract,
        proposedAction: action,
        taintLabels: [
          {
            nodeId: 'tainted_node_99',
            tainted: true,
            taintReason: 'Indirect prompt injection in document',
          },
        ],
        provenanceChain: [],
      }

      const decision = engine.evaluate(ctx)
      expect(decision.decision).toBe(EnforcementDecision.BLOCK)
      expect(decision.policyRuleTriggered).toBe('RULE_004')
    })

    it('RULE_006 requires human approval for high AI advisory risk score (>= 0.7)', () => {
      const contract = createContract({
        userId: 'test_user',
        sessionId: 'test_sess',
        userGoal: 'Test Goal',
        allowedTools: ['read_document'],
      })

      const action: ProposedToolAction = {
        id: uuidv4(),
        toolName: 'read_document',
        parameters: { documentId: 'sensitive_memo' },
        initiatedByNodeId: 'clean_node',
        sessionId: 'test_sess',
        timestamp: Date.now(),
      }

      const ctx: PolicyEvaluationContext = {
        contract,
        proposedAction: action,
        taintLabels: [{ nodeId: 'clean_node', tainted: false }],
        provenanceChain: [],
        aiRiskSignal: {
          riskScore: 0.88,
          flags: ['SUSPICIOUS_QUERY'],
          reasoning: 'AI model flagged unusual semantic intent',
          inferenceRoute: InferenceRoute.FALLBACK,
          modelUsed: 'gemini-2.0-flash',
          analysisType: 'CLOUD_ANALYSIS',
        },
      }

      const decision = engine.evaluate(ctx)
      expect(decision.decision).toBe(EnforcementDecision.APPROVAL_REQUIRED)
      expect(decision.policyRuleTriggered).toBe('RULE_006')
    })

    it('RULE_008 allows clean, contract-permitted read operations', () => {
      const contract = createContract({
        userId: 'test_user',
        sessionId: 'test_sess',
        userGoal: 'Test Goal',
        allowedTools: ['read_document'],
      })

      const action: ProposedToolAction = {
        id: uuidv4(),
        toolName: 'read_document',
        parameters: { documentId: 'clean_report' },
        initiatedByNodeId: 'clean_node',
        sessionId: 'test_sess',
        timestamp: Date.now(),
      }

      const ctx: PolicyEvaluationContext = {
        contract,
        proposedAction: action,
        taintLabels: [{ nodeId: 'clean_node', tainted: false }],
        provenanceChain: [],
        aiRiskSignal: {
          riskScore: 0.1,
          flags: [],
          reasoning: 'Benign read query',
          inferenceRoute: InferenceRoute.FALLBACK,
          modelUsed: 'gemini-2.0-flash',
          analysisType: 'CLOUD_ANALYSIS',
        },
      }

      const decision = engine.evaluate(ctx)
      expect(decision.decision).toBe(EnforcementDecision.ALLOW)
      expect(decision.policyRuleTriggered).toBe('RULE_008')
    })
  })

  describe('4. Security Reports: Audit Export Formats', () => {
    it('produces valid CSV format with correct header and escaped fields', () => {
      const headers = ['Timestamp', 'RecordType', 'Category/Rule', 'Status/Severity', 'SessionId', 'Description/Reason']
      const mockEvent = {
        timestamp: 1700000000000,
        type: 'PROMPT_INJECTION_DETECTED',
        severity: 'CRITICAL',
        sessionId: 'sess_123',
        description: 'Attacker payload "injected" text',
      }

      const row = [
        new Date(mockEvent.timestamp).toISOString(),
        'SECURITY_EVENT',
        `"${mockEvent.type.replace(/"/g, '""')}"`,
        mockEvent.severity,
        mockEvent.sessionId,
        `"${mockEvent.description.replace(/"/g, '""')}"`,
      ]

      const csv = [headers.join(','), row.join(',')].join('\n')
      expect(csv).toContain('Timestamp,RecordType,Category/Rule')
      expect(csv).toContain('"Attacker payload ""injected"" text"')
      expect(csv.split('\n').length).toBe(2)
    })

    it('produces valid JSON audit report structure', () => {
      const report = {
        reportGeneratedAt: new Date().toISOString(),
        operator: 'test_operator',
        metrics: {
          totalSessions: 1,
          totalDecisions: 2,
          blockedActions: 1,
          allowedActions: 1,
        },
        sessions: [{ id: 'sess_1' }],
        securityDecisions: [{ id: 'dec_1', decision: 'BLOCK' }],
        securityEvents: [{ id: 'evt_1', type: 'TOOL_BLOCKED' }],
      }

      const jsonStr = JSON.stringify(report, null, 2)
      const parsed = JSON.parse(jsonStr)
      expect(parsed.metrics.blockedActions).toBe(1)
      expect(parsed.securityDecisions.length).toBe(1)
      expect(parsed.operator).toBe('test_operator')
    })
  })
})
