/**
 * Firebase Configuration
 *
 * Values are loaded exclusively from environment variables.
 * NEVER hardcode credentials here.
 * Copy .env.example → .env.local and fill in your Firebase project values.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
}

const requiredKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
] as const

type ConfigKey = (typeof requiredKeys)[number]

export function validateFirebaseConfig(): { valid: boolean; missing: string[] } {
  const missing = requiredKeys.filter(
    (k) => !firebaseConfig[k as ConfigKey]
  )
  return { valid: missing.length === 0, missing }
}
