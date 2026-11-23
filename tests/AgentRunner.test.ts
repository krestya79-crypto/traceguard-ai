import { describe, it, expect, beforeEach } from 'vitest'
import { AgentRunner } from '../src/agent/AgentRunner'
import { EnforcementDecision } from '../src/types/security'

describe('AgentRunner End-to-End Security Workflows', () => {
  let runner: AgentRunner

  beforeEach(() => {
    runner = new AgentRunner()
  })

  it('SCENARIO A: Successfully executes benign summary task with valid permissions', async () => {
    const result = await runner.runScenarioA()
    expect(result.success).toBe(true)
    expect(result.summary).toContain('Executive Summary')

    const state = runner.getState()
    expect(state).toBeDefined()
    expect(state?.session.allowedActions).toBeGreaterThanOrEqual(1)
    expect(state?.session.blockedActions).toBe(0)
    expect(state?.session.status).toBe('COMPLETED')

    // Verify provenance chain
    const nodes = state?.provenance.getAllNodes() || []
    expect(nodes.some((n) => n.type === 'USER_INSTRUCTION')).toBe(true)
    expect(nodes.some((n) => n.type === 'EXTERNAL_DOCUMENT')).toBe(true)
    expect(nodes.some((n) => n.type === 'AGENT_DERIVATION')).toBe(true)
  })

  it('SCENARIO B: Blocks unauthorized action triggered by indirect prompt injection', async () => {
    const result = await runner.runScenarioB()
    expect(result.blocked).toBe(true)

    const state = runner.getState()
    expect(state).toBeDefined()
    expect(state?.session.blockedActions).toBe(1)

    // Verify TaintEngine flagged the malicious document
    const taintedIds = state?.taintEngine.getTaintedNodeIds() || []
    expect(taintedIds.length).toBeGreaterThan(0)

    // Verify security events were logged
    const injectionEvents = state?.events.filter((e) => e.type === 'PROMPT_INJECTION_DETECTED')
    expect(injectionEvents?.length).toBeGreaterThan(0)

    // Verify the latest decision was BLOCK
    const lastDecision = state?.decisions[state.decisions.length - 1]
    expect(lastDecision?.decision).toBe(EnforcementDecision.BLOCK)
  })

  it('SCENARIO C: Blocks data exfiltration to unauthorized recipient', async () => {
    const result = await runner.runScenarioC()
    expect(result.blocked).toBe(true)

    const state = runner.getState()
    expect(state).toBeDefined()
    expect(state?.session.allowedActions).toBe(1) // read_project_data was allowed
    expect(state?.session.blockedActions).toBe(1) // send_email_mock was blocked

    // Verify RULE_002 was enforced
    const blockDecision = state?.decisions.find((d) => d.decision === EnforcementDecision.BLOCK)
    expect(blockDecision).toBeDefined()
    expect(blockDecision?.policyRuleTriggered).toMatch(/RULE_002|RULE_005/)
  })

  it('prevents runtime enforcement bypass when agent attempts arbitrary tools', async () => {
    await runner.initializeSession({
      userGoal: 'Strict read-only session',
      allowedTools: ['read_document'],
      externalExportPermitted: false,
    })

    const bypassAttempt = await runner.executeToolAction({
      toolName: 'execute_arbitrary_shell',
      parameters: { cmd: 'rm -rf /' },
    })

    expect(bypassAttempt.success).toBe(false)
    expect(bypassAttempt.blocked).toBe(true)
    expect(bypassAttempt.securityDecision?.policyRuleTriggered).toBe('RULE_001')
  })

  it('enforces immutable ExecutionContract even when external content claims override', async () => {
    await runner.initializeSession({
      userGoal: 'Analyze security document',
      allowedTools: ['read_document'],
      externalExportPermitted: false,
    })

    const state = runner.getState()!

    // External payload attempting to alter contract properties directly
    expect(() => {
      Object.assign(state.contract, { externalExportPermitted: true })
    }).toThrow()

    expect(state.contract.externalExportPermitted).toBe(false)
  })
})
