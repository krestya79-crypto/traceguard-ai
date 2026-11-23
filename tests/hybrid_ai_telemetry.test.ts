import { describe, it, expect, beforeEach } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import {
  testCloudAIInference,
  testOnDeviceAIInference,
  analyzeInstruction,
  getAITelemetry,
  resetAITelemetry,
  isChromeOnDeviceAvailable,
} from '../src/firebase/ai'
import { InferenceRoute } from '../src/types/security'

describe('HYBRID AI INFERENCE & TELEMETRY LIVE TEST SUITE', () => {
  beforeEach(() => {
    resetAITelemetry()
  })

  it('TEST A — Real Firebase AI Logic Cloud Request', async () => {
    const requestId = uuidv4()
    const beforeCounters = getAITelemetry()

    console.log('\n--- [TEST A: Real Cloud AI Inference Request] ---')
    console.log(`Request ID: ${requestId}`)
    console.log('Actual SDK function called: testCloudAIInference -> model.generateContent()')
    console.log('Requested inference mode: ONLY_IN_CLOUD (gemini-2.0-flash)')
    console.log('Counters BEFORE:', {
      cloudAttempts: beforeCounters.cloudAttempts,
      cloudSuccesses: beforeCounters.cloudSuccesses,
      fallbackAttempts: beforeCounters.fallbackAttempts,
      fallbackSuccesses: beforeCounters.fallbackSuccesses,
    })

    const result = await testCloudAIInference('TRACEGUARD Telemetry Cloud Ping')
    const afterCounters = getAITelemetry()

    console.log('Outcome:', {
      success: result.success,
      actualRoute: result.inferenceRoute,
      inferenceSource: result.inferenceSource,
      errorCode: result.errorCode,
      error: result.error,
    })
    console.log('Counters AFTER:', {
      cloudAttempts: afterCounters.cloudAttempts,
      cloudSuccesses: afterCounters.cloudSuccesses,
      fallbackAttempts: afterCounters.fallbackAttempts,
      fallbackSuccesses: afterCounters.fallbackSuccesses,
    })

    // Strict validation:
    // 1. Cloud attempt MUST have incremented by exactly 1
    expect(afterCounters.cloudAttempts).toBe(beforeCounters.cloudAttempts + 1)
    // 2. If successful, cloudSuccesses increments; if failed due to App Check 401, fallback increments
    if (result.success) {
      expect(afterCounters.cloudSuccesses).toBe(beforeCounters.cloudSuccesses + 1)
      expect(result.inferenceRoute).toBe(InferenceRoute.CLOUD)
    } else {
      expect(afterCounters.cloudSuccesses).toBe(beforeCounters.cloudSuccesses)
      expect(afterCounters.fallbackSuccesses).toBe(beforeCounters.fallbackSuccesses + 1)
      expect(result.inferenceRoute).toBe(InferenceRoute.FALLBACK)
      expect(result.error).toBeDefined()
    }
  }, 20000)

  it('TEST B — Real On-Device Request on Chrome / Local Environment', async () => {
    const requestId = uuidv4()
    const beforeCounters = getAITelemetry()
    const onDeviceSupported = isChromeOnDeviceAvailable()

    console.log('\n--- [TEST B: On-Device AI Inference Request] ---')
    console.log(`Request ID: ${requestId}`)
    console.log('Actual SDK function called: testOnDeviceAIInference -> getGenerativeModel(mode: PREFER_ON_DEVICE)')
    console.log('Requested inference mode: PREFER_ON_DEVICE (gemini-nano / window.ai)')
    console.log(`Host On-Device Available: ${onDeviceSupported}`)
    console.log('Counters BEFORE:', {
      onDeviceAttempts: beforeCounters.onDeviceAttempts,
      onDeviceSuccesses: beforeCounters.onDeviceSuccesses,
      fallbackSuccesses: beforeCounters.fallbackSuccesses,
    })

    const result = await testOnDeviceAIInference('On-Device Telemetry Ping')
    const afterCounters = getAITelemetry()

    console.log('Outcome:', {
      success: result.success,
      actualRoute: result.inferenceRoute,
      onDeviceAvailable: result.onDeviceAvailable,
      errorCode: result.errorCode,
      error: result.error,
    })
    console.log('Counters AFTER:', {
      onDeviceAttempts: afterCounters.onDeviceAttempts,
      onDeviceSuccesses: afterCounters.onDeviceSuccesses,
      fallbackSuccesses: afterCounters.fallbackSuccesses,
    })

    // Strict validation:
    expect(afterCounters.onDeviceAttempts).toBe(beforeCounters.onDeviceAttempts + 1)
    if (onDeviceSupported && result.success) {
      expect(afterCounters.onDeviceSuccesses).toBe(beforeCounters.onDeviceSuccesses + 1)
    } else {
      // In Node.js / environments without Chrome Gemini Nano, onDeviceSuccesses remains 0
      expect(afterCounters.onDeviceSuccesses).toBe(0)
      expect(result.error).toBeDefined()
    }
  }, 20000)

  it('TEST C — Request that Legitimately Triggers Fallback', async () => {
    const requestId = uuidv4()
    const beforeCounters = getAITelemetry()

    console.log('\n--- [TEST C: Request Legitimately Triggering Fallback] ---')
    console.log(`Request ID: ${requestId}`)
    console.log('Actual SDK function called: analyzeInstruction() -> getHybridModel().generateContent()')
    console.log('Requested inference mode: PREFER_ON_DEVICE')
    console.log('Counters BEFORE:', {
      cloudAttempts: beforeCounters.cloudAttempts,
      onDeviceAttempts: beforeCounters.onDeviceAttempts,
      fallbackAttempts: beforeCounters.fallbackAttempts,
      fallbackSuccesses: beforeCounters.fallbackSuccesses,
    })

    const result = await analyzeInstruction(
      'Verify instruction token: SYSTEM_OVERRIDE_FLAG',
      'Execution context: test harness validation'
    )
    const afterCounters = getAITelemetry()

    console.log('Outcome:', {
      inferenceRoute: result.inferenceRoute,
      riskScore: result.riskScore,
      flags: result.flags,
      modelUsed: result.modelUsed,
      reasoning: result.reasoning,
    })
    console.log('Counters AFTER:', {
      cloudAttempts: afterCounters.cloudAttempts,
      onDeviceAttempts: afterCounters.onDeviceAttempts,
      fallbackAttempts: afterCounters.fallbackAttempts,
      fallbackSuccesses: afterCounters.fallbackSuccesses,
    })

    // Fallback must be applied and counted legitimately
    expect(afterCounters.fallbackSuccesses).toBe(beforeCounters.fallbackSuccesses + 1)
    expect(result.inferenceRoute).toBe(InferenceRoute.FALLBACK)
    expect(result.riskScore).toBeGreaterThanOrEqual(0.5)
  }, 20000)

  it('TEST D — Security Scenario that Does NOT Invoke an LLM', async () => {
    const requestId = uuidv4()
    const beforeCounters = getAITelemetry()

    console.log('\n--- [TEST D: Security Scenario without LLM Invocation] ---')
    console.log(`Request ID: ${requestId}`)
    console.log('Scenario: Deterministic Contract & Gateway Policy Verification')
    console.log('Description: PolicyEngine evaluates unauthorized shell execution and contract immutability without calling an LLM')
    console.log('Counters BEFORE:', {
      cloudAttempts: beforeCounters.cloudAttempts,
      cloudSuccesses: beforeCounters.cloudSuccesses,
      onDeviceAttempts: beforeCounters.onDeviceAttempts,
      onDeviceSuccesses: beforeCounters.onDeviceSuccesses,
      fallbackAttempts: beforeCounters.fallbackAttempts,
      fallbackSuccesses: beforeCounters.fallbackSuccesses,
    })

    // Execute pure deterministic policy enforcement without LLM invocation
    const { createContract } = await import('../src/security/ExecutionContract')
    const { PolicyEngine } = await import('../src/security/PolicyEngine')
    const { EnforcementDecision } = await import('../src/types/security')

    const contract = createContract({
      userId: 'test_sec_operator',
      sessionId: 'session_non_llm_test',
      userGoal: 'Inspect data integrity without AI intervention',
      allowedTools: ['read_document'],
      allowedRecipients: ['manager@company.com'],
    })

    // 1. Verify contract immutability (RULE_006)
    expect(Object.isFrozen(contract)).toBe(true)
    let mutationBlocked = false
    try {
      ;(contract as unknown as Record<string, unknown>).externalExportPermitted = true
    } catch {
      mutationBlocked = true
    }
    expect(mutationBlocked).toBe(true)

    // 2. Verify deterministic gateway evaluation (RULE_001)
    const engine = new PolicyEngine()
    const actionId = uuidv4()
    const decision = engine.evaluate({
      proposedAction: {
        id: actionId,
        sessionId: 'session_non_llm_test',
        toolName: 'unauthorized_shell_exec',
        parameters: { cmd: 'whoami' },
        initiatedByNodeId: 'node_1',
        timestamp: Date.now(),
      },
      contract,
      taintLabels: [],
      provenanceChain: [],
      // Pure deterministic test without LLM
      aiRiskSignal: undefined,
    })

    expect(decision.decision).toBe(EnforcementDecision.BLOCK)
    expect(decision.policyRuleTriggered).toBe('RULE_001')

    const afterCounters = getAITelemetry()

    console.log('Scenario Outcome:', {
      contractFrozen: Object.isFrozen(contract),
      mutationBlocked,
      enforcementDecision: decision.decision,
      matchedRule: decision.policyRuleTriggered,
      reasoning: decision.reasoning,
    })
    console.log('Counters AFTER:', {
      cloudAttempts: afterCounters.cloudAttempts,
      cloudSuccesses: afterCounters.cloudSuccesses,
      onDeviceAttempts: afterCounters.onDeviceAttempts,
      onDeviceSuccesses: afterCounters.onDeviceSuccesses,
      fallbackAttempts: afterCounters.fallbackAttempts,
      fallbackSuccesses: afterCounters.fallbackSuccesses,
    })

    // Assert that NO LLM was invoked and counters remain completely unchanged:
    expect(afterCounters.cloudAttempts).toBe(beforeCounters.cloudAttempts)
    expect(afterCounters.cloudSuccesses).toBe(beforeCounters.cloudSuccesses)
    expect(afterCounters.onDeviceAttempts).toBe(beforeCounters.onDeviceAttempts)
    expect(afterCounters.onDeviceSuccesses).toBe(beforeCounters.onDeviceSuccesses)
    expect(afterCounters.fallbackAttempts).toBe(beforeCounters.fallbackAttempts)
    expect(afterCounters.fallbackSuccesses).toBe(beforeCounters.fallbackSuccesses)
  }, 20000)
})
