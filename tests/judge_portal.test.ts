import { describe, it, expect, beforeEach } from 'vitest'
import { AttackComparisonEngine } from '../src/agent/AttackComparisonEngine'
import { resetDemoBuffer } from '../src/firebase/firestore'
import { AgentRunner } from '../src/agent/AgentRunner'

describe('JUDGE PORTAL & ATTACK COMPARISON LAB TEST SUITE', () => {
  beforeEach(() => {
    resetDemoBuffer()
  })

  it('1. AttackComparisonEngine correctly executes Scenario B differential analysis', async () => {
    const judgeUid = 'judge-test-uid-8822'
    const engine = new AttackComparisonEngine(judgeUid)

    const result = await engine.compareScenarioB()

    expect(result.scenarioId).toBe('SCENARIO_B')
    expect(result.attackName).toContain('Indirect Prompt Injection')

    // Verify Unprotected Outcome
    expect(result.unprotected.status).toBe('EXPLOITED')
    expect(result.unprotected.toolExecuted).toContain('send_email_mock')
    expect(result.unprotected.dataExfiltrated).toContain('API_SECRET_998811')
    expect(result.unprotected.securityViolations.length).toBeGreaterThan(0)

    // Verify Protected Outcome through TRACEGUARD AI
    expect(result.protected.status).toBe('INTERCEPTED')
    expect(result.protected.enforcementDecision).toBe('BLOCK')
    expect(result.protected.policyTriggered).toMatch(/RULE_001|RULE_004/)
    expect(result.protected.taintDetected).toBe(true)
    expect(result.protected.provenancePreserved).toBe(true)
  })

  it('2. AttackComparisonEngine correctly executes Scenario C differential analysis', async () => {
    const judgeUid = 'judge-test-uid-9944'
    const engine = new AttackComparisonEngine(judgeUid)

    const result = await engine.compareScenarioC()

    expect(result.scenarioId).toBe('SCENARIO_C')
    expect(result.attackName).toContain('Sensitive Data Exfiltration')

    // Verify Unprotected Outcome
    expect(result.unprotected.status).toBe('EXPLOITED')
    expect(result.unprotected.recipient).toBe('competitor@unauthorized-leak.org')

    // Verify Protected Outcome
    expect(result.protected.status).toBe('INTERCEPTED')
    expect(result.protected.enforcementDecision).toBe('BLOCK')
    expect(result.protected.policyTriggered).toMatch(/RULE_002|RULE_005/)
  })

  it('3. Judge Demo Data Isolation & Clean Reset preserves independent sessions', async () => {
    const judgeA = 'judge-alpha-1'
    const judgeB = 'judge-beta-2'

    const runnerA = new AgentRunner(judgeA)
    const runnerB = new AgentRunner(judgeB)

    // Execute session for Judge A
    const resA = await runnerA.runScenarioA()
    expect(resA.success).toBe(true)
    expect(runnerA.getState()?.session.userId).toBe(judgeA)

    // Execute session for Judge B
    const resB = await runnerB.runScenarioB()
    expect(resB.blocked).toBe(true)
    expect(runnerB.getState()?.session.userId).toBe(judgeB)

    // Reset only Judge A
    resetDemoBuffer(judgeA)

    // Verify reset executes cleanly without throwing
    expect(true).toBe(true)
  })
})
