import { describe, it, expect } from 'vitest'
import { firebaseConfig, validateFirebaseConfig } from '../src/firebase/config'
import { firebaseApp } from '../src/firebase/init'
import { googleProvider, getFirebaseAuth } from '../src/firebase/auth'
import { db, COLLECTIONS, isFirebaseLive } from '../src/firebase/firestore'
import { getAppCheckStatus } from '../src/firebase/appcheck'
import { getAIInferenceStats, inferenceRouteLabel } from '../src/firebase/ai'
import { AgentRunner } from '../src/agent/AgentRunner'
import { InferenceRoute } from '../src/types/security'

describe('PHASE 2 FIREBASE INTEGRATION TEST SUITE', () => {
  it('1. Firebase Initialization & Project Target Verification', () => {
    expect(firebaseApp).toBeDefined()
    expect(firebaseApp.name).toBe('[DEFAULT]')

    // Target project ID must match user specified project
    expect(firebaseConfig.projectId).toBe('traceguard-ai-448b0')
    expect(firebaseConfig.authDomain).toBe('traceguard-ai-448b0.firebaseapp.com')
    expect(firebaseConfig.storageBucket).toBe('traceguard-ai-448b0.firebasestorage.app')

    console.log('[Target Firebase Project]:', firebaseConfig.projectId)
    console.log('[Target Auth Domain]:', firebaseConfig.authDomain)
  })

  it('2. Configuration Validation & Missing Keys Report', () => {
    const { valid, missing } = validateFirebaseConfig()

    // Until user pastes API key and App IDs, validateFirebaseConfig correctly reports missing keys
    console.log('[Config Status] Is Valid:', valid)
    console.log('[Config Status] Missing Keys:', missing)

    if (!valid) {
      expect(missing).toContain('apiKey')
      expect(missing).toContain('messagingSenderId')
      expect(missing).toContain('appId')
    }
  })

  it('3. Firebase Authentication Provider & State API Verification', () => {
    const authInstance = getFirebaseAuth()
    console.log('[Auth Instance Status]:', authInstance ? 'INITIALIZED' : 'DEFERRED_AWAITING_API_KEY')
    expect(googleProvider).toBeDefined()
    expect(googleProvider.providerId).toBe('google.com')
  })

  it('4. Cloud Firestore Collections & Live Mode Telemetry', () => {
    expect(db).toBeDefined()
    expect(COLLECTIONS.USERS).toBe('users')
    expect(COLLECTIONS.AGENT_SESSIONS).toBe('agent_sessions')
    expect(COLLECTIONS.EXECUTION_TRACES).toBe('execution_traces')
    expect(COLLECTIONS.SECURITY_EVENTS).toBe('security_events')
    expect(COLLECTIONS.SECURITY_DECISIONS).toBe('security_decisions')
    expect(COLLECTIONS.SECURITY_REPORTS).toBe('security_reports')
    expect(COLLECTIONS.EXECUTION_CONTRACTS).toBe('execution_contracts')

    // isFirebaseLive() returns true only when all required config keys are populated
    const live = isFirebaseLive()
    console.log('[Firestore Mode]:', live ? 'LIVE_CLOUD_MODE' : 'LOCAL_BUFFER_MODE')
  })

  it('5. Firebase App Check State & Debug Token Capability', () => {
    const appCheckStatus = getAppCheckStatus()
    expect(appCheckStatus).toBeDefined()
    console.log('[App Check Status]:', appCheckStatus)
  })

  it('6. Firebase AI Logic Telemetry & Honest Route Display', () => {
    const stats = getAIInferenceStats()
    expect(stats).toBeDefined()
    expect(typeof stats.onDeviceCount).toBe('number')
    expect(typeof stats.cloudCount).toBe('number')
    expect(typeof stats.fallbackCount).toBe('number')

    // Route labels must map accurately
    expect(inferenceRouteLabel(InferenceRoute.ON_DEVICE)).toBe('ON-DEVICE')
    expect(inferenceRouteLabel(InferenceRoute.CLOUD)).toBe('CLOUD')
    expect(inferenceRouteLabel(InferenceRoute.FALLBACK)).toBe('FALLBACK')
  })

  it('7. End-to-End Security Gateway Execution with User Association', async () => {
    const runner = new AgentRunner()
    const testUid = 'usr_audit_test_99'

    await runner.initializeSession({
      userId: testUid,
      userGoal: 'Audit user association and gateway defense',
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
    expect(state.session.blockedActions).toBe(1)
  })
})
