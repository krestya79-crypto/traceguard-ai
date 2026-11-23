import { useState, useEffect } from 'react'
import type { User } from 'firebase/auth'
import {
  onAuthChange,
  signInWithGoogle,
  signOutUser,
  getCurrentUser,
} from '../firebase/auth'
import { upsertUser, isFirebaseLive } from '../firebase/firestore'

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  isLive: boolean
  signIn: () => Promise<User | null>
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(getCurrentUser())
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const isLive = isFirebaseLive()

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)

      if (firebaseUser) {
        try {
          await upsertUser(firebaseUser.uid, {
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Security Operator',
          })
        } catch (err) {
          console.warn('[useAuth] Profile sync warning:', err)
        }
      }
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (): Promise<User | null> => {
    setError(null)
    setLoading(true)
    try {
      const signedInUser = await signInWithGoogle()
      setUser(signedInUser)
      return signedInUser
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      console.error('[useAuth] Google Sign-In failed:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  const signOut = async (): Promise<void> => {
    setError(null)
    setLoading(true)
    try {
      await signOutUser()
      setUser(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      console.error('[useAuth] Sign-Out failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    loading,
    error,
    isLive,
    signIn,
    signOut,
  }
}
