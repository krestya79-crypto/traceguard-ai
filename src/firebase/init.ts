import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { firebaseConfig, validateFirebaseConfig } from './config'

let _app: FirebaseApp | null = null

export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app

  const { valid, missing } = validateFirebaseConfig()
  if (!valid) {
    console.warn(
      '[TRACEGUARD] Firebase config incomplete — missing env vars:',
      missing.join(', '),
      '\nCreate .env.local from .env.example with your Firebase project values.'
    )
  }

  if (getApps().length === 0) {
    _app = initializeApp(firebaseConfig)
  } else {
    _app = getApps()[0]
  }

  return _app
}
// Eagerly initialize so services can import it
export const firebaseApp: FirebaseApp = getFirebaseApp()

// Initialize App Check early in browser environments before protected requests
import { initializeAppCheckService } from './appcheck'
if (typeof window !== 'undefined') {
  try {
    initializeAppCheckService()
  } catch (err) {
    console.warn('[TRACEGUARD] Deferred App Check initialization:', err)
  }
}

\n