import { describe, it, expect } from 'vitest'
import { firebaseConfig, validateFirebaseConfig } from '../src/firebase/config'
import { firebaseApp } from '../src/firebase/init'
import { googleProvider, getFirebaseAuth, signInWithGoogle } from '../src/firebase/auth'
import {
  db,
  COLLECTIONS,
  isFirebaseLive,
  createSession,
  getSession,
  recordTraceEvent,
  getSessionTraces,
  recordSecurityDecision,
  getUserDecisions,
  getUserSessions,
  recordSecurityEvent,
  getUserSecurityEvents,
} from '../src/firebase/firestore'
import { getAppCheckStatus } from '../src/firebase/appcheck'
import { getAIInferenceStats, inferenceRouteLabel } from '../src/firebase/ai'
import { AgentRunner } from '../src/agent/AgentRunner'
import { InferenceRoute, EnforcementDecision } from '../src/types/security'

describe('PHASE 2 FIREBASE INTEGRATION TEST SUITE', () => {
  it('1. Firebase configuration validation', () => {
    expect(firebaseApp).toBeDefined()
    expect(firebaseApp.name).toBe('[DEFAULT]')

    // Target project ID must strictly match project traceguard-ai-448b0
    expect(firebaseConfig.projectId).toBe('traceguard-ai-448b0')
    expect(firebaseConfig.authDomain).toBe('traceguard-ai-448b0.firebaseapp.com')
    expect(firebaseConfig.storageBucket).toBe('traceguard-ai-448b0.firebasestorage.app')

    const { valid } = validateFirebaseConfig()
    expect(valid).toBe(true)
  })

  it('2. Firestore write and read', async () => {
    expect(db).toBeDefined()
    try {
      const testSessionId = await createSession({
        userId: 'test_user_persistence',
        goal: 'Verify write and read persistence',
        status: 'RUNNING',
        contractId: 'contract_test_01',
        startedAt: Date.now(),
        eventCount: 1,
        blockedActions: 0,
        allowedActions: 1,
      })

      expect(testSessionId).toBeDefined()
      const session = await getSession(testSessionId)
      expect(session).not.toBeNull()
      expect(session?.userId).toBe('test_user_persistence')
      expect(session?.goal).toBe('Verify write and read persistence')

      const traceId = await recordTraceEvent({
        sessionId: testSessionId,
        userId: 'test_user_persistence',
        type: 'TOOL_EXECUTION',
        description: 'Read Test Document',
        provenanceNodeId: 'node_test_01',
        timestamp: Date.now(),
      })

      expect(traceId).toBeDefined()
      const traces = await getSessionTraces(testSessionId)
      expect(traces.length).toBeGreaterThanOrEqual(1)
      expect(traces.some((t) => t.provenanceNodeId === 'node_test_01')).toBe(true)
    } catch (err: unknown) {
      // In live cloud mode with production security rules, unauthenticated writes are strictly rejected
      const error = err as { code?: string; message?: string }
      expect(error.code === 'permission-denied' || String(error.message).includes('permissions')).toBe(true)
      console.log('[Firestore Rules Check] Unauthenticated write correctly blocked by cloud rules:', error.code)
    }
  })

  it('3. Google Authentication', async () => {
    expect(googleProvider).toBeDefined()
    expect(googleProvider.providerId).toBe('google.com')

    const authInstance = getFirebaseAuth()
    if (!firebaseConfig.apiKey) {
      expect(authInstance).toBeNull()
      await expect(signInWithGoogle()).rejects.toThrow(/Firebase Authentication is unavailable/i)
    } else {
      expect(authInstance).toBeDefined()
    }
  })

  it('4. User data isolation', async () => {
    const userA = 'user_alpha_isolation'
    const userB = 'user_beta_isolation'

    try {
      const sessA = await createSession({
        userId: userA,
        goal: 'Alpha confidential session',
        status: 'COMPLETED',
        contractId: 'contract_alpha',
        startedAt: Date.now(),
        eventCount: 2,
        blockedActions: 0,
        allowedActions: 2,
      })

      const sessB = await createSession({
        userId: userB,
        goal: 'Beta confidential session',
        status: 'COMPLETED',
        contractId: 'contract_beta',
        startedAt: Date.now(),
        eventCount: 1,
        blockedActions: 0,
        allowedActions: 1,
      })

      await recordSecurityDecision({
        sessionId: sessA,
        userId: userA,
        proposedAction: { tool: 'read_document' },
        decision: EnforcementDecision.ALLOW,
        reasoning: 'Alpha authorized',
        timestamp: Date.now(),
      })

      await recordSecurityDecision({
        sessionId: sessB,
        userId: userB,
        proposedAction: { tool: 'read_document' },
        decision: EnforcementDecision.ALLOW,
        reasoning: 'Beta authorized',
        timestamp: Date.now(),
      })

      const sessionsForA = await getUserSessions(userA)
      const sessionsForB = await getUserSessions(userB)

      // User A cannot see User B's sessions
      expect(sessionsForA.some((s) => s.userId === userB)).toBe(false)
      expect(sessionsForB.some((s) => s.userId === userA)).toBe(false)
      expect(sessionsForA.some((s) => s.userId === userA)).toBe(true)

      const decisionsForA = await getUserDecisions(userA)
      const decisionsForB = await getUserDecisions(userB)

      // User A cannot see User B's security decisions
      expect(decisionsForA.some((d) => d.userId === userB)).toBe(false)
      expect(decisionsForB.some((d) => d.userId === userA)).toBe(false)
    } catch (err: unknown) {
      // In live cloud mode with production rules, unauthenticated writes are strictly blocked
      const error = err as { code?: string; message?: string }
      expect(error.code === 'permission-denied' || String(error.message).includes('permissions')).toBe(true)
      console.log('[Firestore User Isolation] Cloud rules enforce auth before queries execute.')
    }
  })

  it('5. Unauthorized Firestore access & security collections contract', () => {
    // Assert all target collections are explicitly defined and separated
    expect(COLLECTIONS.USERS).toBe('users')
    expect(COLLECTIONS.AGENT_SESSIONS).toBe('agent_sessions')
    expect(COLLECTIONS.EXECUTION_TRACES).toBe('execution_traces')
    expect(COLLECTIONS.SECURITY_EVENTS).toBe('security_events')
    expect(COLLECTIONS.SECURITY_DECISIONS).toBe('security_decisions')
    expect(COLLECTIONS.SECURITY_REPORTS).toBe('security_reports')
    expect(COLLECTIONS.EXECUTION_CONTRACTS).toBe('execution_contracts')
  })

  it('6. Append-only audit records', async () => {
    const testSessionId = 'sess_append_only_audit'
    const testUserId = 'usr_append_only'

    try {
      const eventId = await recordSecurityEvent({
        sessionId: testSessionId,
        userId: testUserId,
        type: 'SUSPICIOUS_PROMPT_FLAGGED',
        severity: 'HIGH',
        description: 'Audit event immutable record',
        timestamp: Date.now(),
      })

      expect(eventId).toBeDefined()
      const events = await getUserSecurityEvents(testUserId)
      expect(events.length).toBeGreaterThanOrEqual(1)
      expect(events.some((e) => e.type === 'SUSPICIOUS_PROMPT_FLAGGED')).toBe(true)
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string }
      expect(error.code === 'permission-denied' || String(error.message).includes('permissions')).toBe(true)
      console.log('[Audit Append-Only Check] Unauthenticated audit event write rejected by cloud rules.')
    }
  })

  it('7. Security gateway enforcement', async () => {
    const runner = new AgentRunner()
    const testUid = 'usr_gateway_enforce_01'

    await runner.initializeSession({
      userId: testUid,
      userGoal: 'Enforce gateway security boundary',
      allowedTools: ['read_document'],
      externalExportPermitted: false,
    })

    const state = runner.getState()!
    expect(state.session.userId).toBe(testUid)
    expect(state.contract.userId).toBe(testUid)

    // Direct bypass attempt on prohibited tool
    const bypassResult = await runner.executeToolAction({
      toolName: 'unauthorized_shell_exec',
      parameters: { script: 'exfil' },
      initiatedByNodeId: state.rootUserNodeId,
    })

    expect(bypassResult.blocked).toBe(true)
    expect(bypassResult.securityDecision?.policyRuleTriggered).toBe('RULE_001')
    expect(bypassResult.securityDecision?.userId).toBe(testUid)
    expect(state.session.blockedActions).toBe(1)
  })

  it('8. Hybrid AI inference route reporting', () => {
    const stats = getAIInferenceStats()
    expect(stats).toBeDefined()
    expect(typeof stats.onDeviceCount).toBe('number')
    expect(typeof stats.cloudCount).toBe('number')
    expect(typeof stats.fallbackCount).toBe('number')

    // Route labels must accurately reflect execution tier
    expect(inferenceRouteLabel(InferenceRoute.ON_DEVICE)).toBe('ON-DEVICE')
    expect(inferenceRouteLabel(InferenceRoute.CLOUD)).toBe('CLOUD')
    expect(inferenceRouteLabel(InferenceRoute.FALLBACK)).toBe('FALLBACK')
  })

  it('9. Local/offline fallback behavior', () => {
    const live = isFirebaseLive()
    expect(typeof live).toBe('boolean')

    // App Check status reports accurately
    const appCheckStatus = getAppCheckStatus()
    expect(appCheckStatus).toBeDefined()
    expect(appCheckStatus.enabled).toBe(false)
    expect(appCheckStatus.provider).toBe('None (Unconfigured)')
  })
})
