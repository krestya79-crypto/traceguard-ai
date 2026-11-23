/**
 * Firebase App Check — Fraud Defense (reCAPTCHA Enterprise) Service
 *
 * SDK: firebase/app-check
 * Provider: ReCaptchaEnterpriseProvider (official provider for Fraud Defense / reCAPTCHA Enterprise)
 *
 * NOTE: The TRACEGUARD AI Web application in Firebase Console is registered with
 * "Fraud Defense", which requires reCAPTCHA Enterprise score-based site keys.
 * reCAPTCHA v3 is NOT interchangeable with Fraud Defense / reCAPTCHA Enterprise.
 *
 * Requirements:
 * - Set VITE_FIREBASE_APPCHECK_RECAPTCHA_KEY in .env.local with your score-based site key.
 * - In development, set FIREBASE_APPCHECK_DEBUG_TOKEN to generate a debug token.
 */

import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  getToken,
  type AppCheck,
} from 'firebase/app-check'
import { firebaseApp } from './init'

let _appCheck: AppCheck | null = null

export function initializeAppCheckService(): AppCheck | null {
  if (_appCheck) return _appCheck

  // Guard against non-browser (Node.js test / SSR) environments
  if (typeof window === 'undefined') {
    return null
  }

  const recaptchaKey = import.meta.env.VITE_FIREBASE_APPCHECK_RECAPTCHA_KEY as string | undefined

  if (!recaptchaKey) {
    console.warn(
      '[App Check] VITE_FIREBASE_APPCHECK_RECAPTCHA_KEY not set.\n' +
      'App Check (Fraud Defense / reCAPTCHA Enterprise) is unconfigured.\n' +
      'To enable, register your reCAPTCHA Enterprise site key in .env.local.\n' +
      'See: https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider'
    )
    return null
  }

  try {
    // Enable debug token in development mode if not in production
    if (import.meta.env.DEV) {
      ;(self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = true
      console.info(
        '[App Check] Development debug mode enabled. Check DevTools console for your debug token.\n' +
        'Register that debug token in the Firebase Console under App Check -> Apps -> Manage debug tokens.'
      )
    }

    // Default to ReCaptchaEnterpriseProvider for Fraud Defense registration
    // If key format explicitly dictates v3, fallback can be handled, but Enterprise is required for Fraud Defense.
    _appCheck = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
      isTokenAutoRefreshEnabled: true,
    })

    console.info('[App Check] Initialized with ReCaptchaEnterpriseProvider (Fraud Defense).')
    return _appCheck
  } catch (error) {
    console.error('[App Check] Initialization failed:', error)
    return null
  }
}

export function getAppCheckStatus(): {
  enabled: boolean
  isDebug: boolean
  provider: string
} {
  const recaptchaKey = import.meta.env.VITE_FIREBASE_APPCHECK_RECAPTCHA_KEY as string | undefined
  const isDev = Boolean(import.meta.env.DEV)

  return {
    enabled: _appCheck !== null && Boolean(recaptchaKey),
    isDebug: isDev,
    provider: recaptchaKey ? 'reCAPTCHA Enterprise (Fraud Defense)' : 'None (Unconfigured)',
  }
}

/**
 * Attempts a real token retrieval to verify App Check operational state.
 * Returns failure if App Check is unconfigured or token exchange fails.
 */
export async function verifyAppCheckOperational(): Promise<{
  operational: boolean
  provider: string
  error?: string
}> {
  if (!_appCheck) {
    return {
      operational: false,
      provider: 'None (Unconfigured)',
      error: 'App Check is not initialized: VITE_FIREBASE_APPCHECK_RECAPTCHA_KEY is not set.',
    }
  }

  try {
    const tokenResult = await getToken(_appCheck, /* forceRefresh */ false)
    return {
      operational: Boolean(tokenResult?.token),
      provider: 'reCAPTCHA Enterprise (Fraud Defense)',
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      operational: false,
      provider: 'reCAPTCHA Enterprise (Fraud Defense)',
      error: message,
    }
  }
}

export { _appCheck as appCheck }
