import { describe, it, expect } from 'vitest'
import { AgentRunner } from '../src/agent/AgentRunner'

describe('Scenario Identity & Independent Result Mapping Tests', () => {
  it('Scenario A executes independently and returns benign summary outcome', async () => {
    const runnerA = new AgentRunner()
    const resultA = await runnerA.runScenarioA()
    const stateA = runnerA.getState()

    expect(resultA.success).toBe(true)
    expect(resultA.summary).toContain('Project Alpha')
    expect(stateA!.session.goal).toContain('Project Alpha')
    expect(stateA!.session.status).toBe('COMPLETED')
    expect(stateA!.session.id).toBeDefined()
  }, 15000)

  it('Scenario B executes independently, intercepts injection, and never returns Scenario A outcome', async () => {
    const runnerB = new AgentRunner()
    const resultB = await runnerB.runScenarioB()
    const stateB = runnerB.getState()

    expect(resultB.blocked).toBe(true)
    expect(resultB.violationReason).toBeDefined()
    // Verify Scenario B does NOT contain Scenario A details
    expect(stateB!.session.goal).not.toContain('Project Alpha')
    expect(stateB!.session.goal).toContain('Review vendor integration notes')
    expect(stateB!.session.status).toBe('BLOCKED')

    // Verify injected taint event was captured
    const injectionEvent = stateB!.events.find((e) => e.type === 'PROMPT_INJECTION_DETECTED')
    expect(injectionEvent).toBeDefined()
  }, 15000)

  it('Scenario C executes independently and intercepts data exfiltration with unique session', async () => {
    const runnerC = new AgentRunner()
    const resultC = await runnerC.runScenarioC()
    const stateC = runnerC.getState()

    expect(resultC.blocked).toBe(true)
    expect(resultC.violationReason).toBeDefined()
    expect(stateC!.session.goal).toContain('Prepare email update about project milestones')
    expect(stateC!.contract.allowedRecipients).toEqual(['manager@company.com'])
  }, 15000)

  it('Sequential execution (A -> B -> C) preserves strict scenario identity and unique session IDs', async () => {
    const runnerA = new AgentRunner()
    const resA = await runnerA.runScenarioA()
    const stateA = runnerA.getState()

    const runnerB = new AgentRunner()
    const resB = await runnerB.runScenarioB()
    const stateB = runnerB.getState()

    const runnerC = new AgentRunner()
    const resC = await runnerC.runScenarioC()
    const stateC = runnerC.getState()

    // 1. Verify all 3 sessions have unique IDs
    expect(stateA!.session.id).not.toEqual(stateB!.session.id)
    expect(stateB!.session.id).not.toEqual(stateC!.session.id)
    expect(stateA!.session.id).not.toEqual(stateC!.session.id)

    // 2. Verify results are distinct
    expect(resA.success).toBe(true)
    expect(resB.blocked).toBe(true)
    expect(resC.blocked).toBe(true)

    // 3. Verify violation reasons are distinct between B and C
    expect(resB.violationReason).not.toEqual(resC.violationReason)
  }, 30000)

  it('Rapid scenario execution produces isolated provenance trees without node leakage', async () => {
    const runner1 = new AgentRunner()
    const runner2 = new AgentRunner()

    const [resA, resB] = await Promise.all([
      runner1.runScenarioA(),
      runner2.runScenarioB(),
    ])

    expect(resA.success).toBe(true)
    expect(resB.blocked).toBe(true)

    const nodes1 = runner1.getState()!.provenance.getAllNodes()
    const nodes2 = runner2.getState()!.provenance.getAllNodes()

    // Nodes from runner1 must not be present in runner2
    const runner1Ids = new Set(nodes1.map((n) => n.id))
    for (const n2 of nodes2) {
      expect(runner1Ids.has(n2.id)).toBe(false)
    }
  }, 20000)
})
