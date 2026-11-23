import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth'
import { firebaseApp } from './init'
import { firebaseConfig } from './config'

let _auth: Auth | null = null

export function getFirebaseAuth(): Auth | null {
  if (_auth) return _auth
  if (!firebaseConfig.apiKey) {
    return null
  }
  try {
    _auth = getAuth(firebaseApp)
    return _auth
  } catch (err) {
    console.warn('[Firebase Auth] Init deferred:', err)
    return null
  }
}

export const auth: Auth | null = getFirebaseAuth()
export const googleProvider = new GoogleAuthProvider()

export async function signInWithGoogle(): Promise<User> {
  const a = getFirebaseAuth()
  if (!a) {
    throw new Error(
      'Firebase Authentication is unavailable. Please provide your VITE_FIREBASE_API_KEY in .env.local.'
    )
  }
  const result = await signInWithPopup(a, googleProvider)
  return result.user
}

export async function signOutUser(): Promise<void> {
  const a = getFirebaseAuth()
  if (!a) return
  await signOut(a)
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  const a = getFirebaseAuth()
  if (!a) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(a, callback)
}

export function getCurrentUser(): User | null {
  const a = getFirebaseAuth()
  return a ? a.currentUser : null
}
