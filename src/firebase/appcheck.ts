import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from 'firebase/app-check'
import { firebaseApp } from './init'

let _appCheck: AppCheck | null = null

/**
 * Initializes Firebase App Check with reCAPTCHA v3.
 *
 * Requirements:
 * - Set VITE_FIREBASE_APPCHECK_RECAPTCHA_KEY in .env.local
 * - Register your site key at console.firebase.google.com → App Check
 *
 * In development, a debug token is auto-generated and printed to the console.
 * Register that token in the Firebase console under App Check → Apps → Manage debug tokens.
 *
 * App Check is OPTIONAL for local dev but REQUIRED for production.
 */
export function initializeAppCheckService(): AppCheck | null {
  if (_appCheck) return _appCheck

  const recaptchaKey = import.meta.env.VITE_FIREBASE_APPCHECK_RECAPTCHA_KEY as string | undefined

  if (!recaptchaKey) {
    console.warn(
      '[App Check] VITE_FIREBASE_APPCHECK_RECAPTCHA_KEY not set.\n' +
      'App Check is disabled. It is required for production deployments.\n' +
      'See: https://firebase.google.com/docs/app-check/web/recaptcha-provider'
    )
    return null
  }

  try {
    // Enable debug token in development (printed to DevTools console)
    if (import.meta.env.DEV) {
      ;(self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = true
      console.info('[App Check] Debug mode enabled — register the printed token in Firebase Console.')
    }

    _appCheck = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(recaptchaKey),
      isTokenAutoRefreshEnabled: true,
    })

    console.info('[App Check] Initialized successfully.')
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
  return {
    enabled: _appCheck !== null && Boolean(recaptchaKey),
    isDebug: Boolean(import.meta.env.DEV),
    provider: recaptchaKey ? 'reCAPTCHA v3' : 'None (Unconfigured)',
  }
}

export { _appCheck as appCheck }
