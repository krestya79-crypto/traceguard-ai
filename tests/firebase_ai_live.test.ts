import { describe, it, expect } from 'vitest'
import { testCloudAIInference, getAIInferenceStats } from '../src/firebase/ai'
import { firebaseConfig } from '../src/firebase/config'
import { InferenceRoute } from '../src/types/security'

describe('FIREBASE AI LOGIC LIVE INFERENCE INVESTIGATION', () => {
  it('1. Verifies target Firebase Project ID is traceguard-ai-448b0', () => {
    expect(firebaseConfig.projectId).toBe('traceguard-ai-448b0')
    expect(firebaseConfig.authDomain).toBe('traceguard-ai-448b0.firebaseapp.com')
  })

  it('2. Executes a real Cloud AI inference request and reports exact outcome', async () => {
    console.log('[AI Investigation] Initiating real Cloud AI inference probe...')
    const result = await testCloudAIInference('Ping')

    console.log('[AI Investigation Result]:', {
      success: result.success,
      inferenceSource: result.inferenceSource ?? 'N/A (Request did not reach Gemini runtime)',
      inferenceRoute: result.inferenceRoute,
      errorCode: result.errorCode,
      actionRequired: result.actionRequired,
    })

    if (result.success) {
      console.log('[AI Investigation SUCCESS] Response:', result.response)
      expect(result.inferenceSource).toBeDefined()
    } else {
      console.log('[AI Investigation FAILED (Expected until Console enabled)] Error:', result.error)
      // Must honestly report FALLBACK and not claim successful Gemini inference
      expect(result.inferenceRoute).toBe(InferenceRoute.FALLBACK)
      expect(result.error).not.toContain(firebaseConfig.apiKey)
    }

    const stats = getAIInferenceStats()
    expect(stats).toBeDefined()
    // Verification that fallback count tracked accurately
    expect(stats.fallbackCount).toBeGreaterThanOrEqual(1)
  })
})
