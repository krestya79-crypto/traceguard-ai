import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore'
import { firebaseApp } from './init'
import { validateFirebaseConfig } from './config'
import type {
  FirestoreSession,
  FirestoreTraceEvent,
  FirestoreSecurityDecision,
  FirestoreSecurityEvent,
  FirestoreUser,
} from '../types/firestore'

export const db = getFirestore(firebaseApp)

export const isFirebaseLive = (): boolean => validateFirebaseConfig().valid

// ── Collection names (single source of truth) ─────────────────────────────
export const COLLECTIONS = {
  USERS: 'users',
  AGENT_SESSIONS: 'agent_sessions',
  EXECUTION_TRACES: 'execution_traces',
  SECURITY_EVENTS: 'security_events',
  SECURITY_DECISIONS: 'security_decisions',
  SECURITY_REPORTS: 'security_reports',
  EXECUTION_CONTRACTS: 'execution_contracts',
} as const

// ── LocalStorage persistence keys for unauthenticated demo resilience ─────────
const SESSIONS_KEY = 'traceguard_sessions_v1'
const TRACES_KEY = 'traceguard_traces_v1'
const DECISIONS_KEY = 'traceguard_decisions_v1'
const EVENTS_KEY = 'traceguard_events_v1'

function initBuffer<T>(key: string): T[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const data = window.localStorage.getItem(key)
      if (data) return JSON.parse(data)
    } catch {}
  }
  return []
}

function persistBuffer<T>(key: string, items: T[]) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, JSON.stringify(items.slice(0, 200)))
    } catch {}
  }
}

// ── Persistent buffer (active for unauthenticated demo sessions & offline fallback) ──
const localSessions: (FirestoreSession & { id: string })[] = initBuffer(SESSIONS_KEY)
const localTraces: (FirestoreTraceEvent & { id: string })[] = initBuffer(TRACES_KEY)
const localDecisions: (FirestoreSecurityDecision & { id: string })[] = initBuffer(DECISIONS_KEY)
const localEvents: (FirestoreSecurityEvent & { id: string })[] = initBuffer(EVENTS_KEY)
const localUsers: Map<string, FirestoreUser & { id: string }> = new Map()

function saveLocalSessions() {
  persistBuffer(SESSIONS_KEY, localSessions)
}
function saveLocalTraces() {
  persistBuffer(TRACES_KEY, localTraces)
}
function saveLocalDecisions() {
  persistBuffer(DECISIONS_KEY, localDecisions)
}
function saveLocalEvents() {
  persistBuffer(EVENTS_KEY, localEvents)
}

// ── Users ──────────────────────────────────────────────────────────────────
export async function upsertUser(userId: string, data: Partial<FirestoreUser>): Promise<void> {
  const existing = localUsers.get(userId) || {
    id: userId,
    email: data.email || 'operator@traceguard.ai',
    displayName: data.displayName || 'Security Operator',
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  }
  localUsers.set(userId, { ...existing, ...data, lastActiveAt: Date.now() })

  if (isFirebaseLive()) {
    try {
      const ref = doc(db, COLLECTIONS.USERS, userId)
      await setDoc(ref, { ...data, lastActiveAt: serverTimestamp() }, { merge: true })
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code !== 'permission-denied') {
        console.warn('[Firestore] upsertUser fallback to buffer:', err)
      }
    }
  }
}

export async function getUser(userId: string): Promise<(FirestoreUser & { id: string }) | null> {
  if (isFirebaseLive()) {
    try {
      const ref = doc(db, COLLECTIONS.USERS, userId)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        return { id: snap.id, ...(snap.data() as FirestoreUser) }
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code !== 'permission-denied') {
        throw err
      }
    }
  }
  return localUsers.get(userId) || null
}

// ── Agent Sessions ─────────────────────────────────────────────────────────
export async function createSession(data: FirestoreSession): Promise<string> {
  if (isFirebaseLive()) {
    try {
      const ref = await addDoc(collection(db, COLLECTIONS.AGENT_SESSIONS), {
        ...data,
        startedAt: serverTimestamp(),
      })
      const sessionWithId = { id: ref.id, ...data, startedAt: Date.now() }
      localSessions.unshift(sessionWithId)
      saveLocalSessions()
      return ref.id
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === 'permission-denied') {
        // Fall back to persistent local buffer when unauthenticated / denied by security rules
        const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        const localSession = { id, ...data, startedAt: Date.now() }
        localSessions.unshift(localSession)
        saveLocalSessions()
        return id
      }
      throw err
    }
  }
  const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const localSession = { id, ...data, startedAt: Date.now() }
  localSessions.unshift(localSession)
  saveLocalSessions()
  return id
}

export async function updateSession(
  sessionId: string,
  data: Partial<FirestoreSession>
): Promise<void> {
  const idx = localSessions.findIndex((s) => s.id === sessionId)
  if (idx !== -1) {
    localSessions[idx] = { ...localSessions[idx], ...data }
    saveLocalSessions()
  }

  if (isFirebaseLive()) {
    try {
      const ref = doc(db, COLLECTIONS.AGENT_SESSIONS, sessionId)
      await setDoc(ref, data, { merge: true })
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === 'permission-denied') {
        return
      }
      throw err
    }
  }
}

export async function getSession(
  sessionId: string
): Promise<(FirestoreSession & { id: string }) | null> {
  if (isFirebaseLive()) {
    try {
      const ref = doc(db, COLLECTIONS.AGENT_SESSIONS, sessionId)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        return { id: snap.id, ...(snap.data() as FirestoreSession) }
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code !== 'permission-denied') {
        throw err
      }
    }
  }
  return localSessions.find((s) => s.id === sessionId) || null
}

export async function getUserSessions(
  userId: string,
  limitCount = 20
): Promise<(FirestoreSession & { id: string })[]> {
  if (isFirebaseLive()) {
    try {
      const q = query(
        collection(db, COLLECTIONS.AGENT_SESSIONS),
        where('userId', '==', userId),
        orderBy('startedAt', 'desc'),
        limit(limitCount)
      )
      const snap = await getDocs(q)
      if (snap.docs.length > 0) {
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreSession) }))
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code !== 'permission-denied') {
        throw err
      }
    }
  }
  return localSessions.filter((s) => s.userId === userId).slice(0, limitCount)
}

// ── Execution Traces ───────────────────────────────────────────────────────
export async function recordTraceEvent(data: FirestoreTraceEvent): Promise<string> {
  const sanitized: Record<string, unknown> = {}
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined) sanitized[k] = v
  })

  if (isFirebaseLive()) {
    try {
      const ref = await addDoc(collection(db, COLLECTIONS.EXECUTION_TRACES), {
        ...sanitized,
        timestamp: serverTimestamp(),
      })
      const traceWithId = { id: ref.id, ...data, timestamp: Date.now() }
      localTraces.push(traceWithId)
      saveLocalTraces()
      return ref.id
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === 'permission-denied') {
        const id = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        const localTrace = { id, ...data, timestamp: Date.now() }
        localTraces.push(localTrace)
        saveLocalTraces()
        return id
      }
      throw err
    }
  }
  const id = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const localTrace = { id, ...data, timestamp: Date.now() }
  localTraces.push(localTrace)
  saveLocalTraces()
  return id
}

export async function getSessionTraces(
  sessionId: string
): Promise<(FirestoreTraceEvent & { id: string })[]> {
  if (isFirebaseLive()) {
    try {
      const q = query(
        collection(db, COLLECTIONS.EXECUTION_TRACES),
        where('sessionId', '==', sessionId),
        orderBy('timestamp', 'asc')
      )
      const snap = await getDocs(q)
      if (snap.docs.length > 0) {
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreTraceEvent) }))
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code !== 'permission-denied') {
        throw err
      }
    }
  }
  return localTraces.filter((t) => t.sessionId === sessionId)
}

// ── Security Decisions ─────────────────────────────────────────────────────
export async function recordSecurityDecision(
  data: FirestoreSecurityDecision
): Promise<string> {
  const sanitized: Record<string, unknown> = {}
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined) sanitized[k] = v
  })

  if (isFirebaseLive()) {
    try {
      const ref = await addDoc(collection(db, COLLECTIONS.SECURITY_DECISIONS), {
        ...sanitized,
        timestamp: serverTimestamp(),
      })
      const decisionWithId = { id: ref.id, ...data, timestamp: Date.now() }
      localDecisions.unshift(decisionWithId)
      saveLocalDecisions()
      return ref.id
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === 'permission-denied') {
        const id = `decision_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        const localDecision = { id, ...data, timestamp: Date.now() }
        localDecisions.unshift(localDecision)
        saveLocalDecisions()
        return id
      }
      throw err
    }
  }
  const id = `decision_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const localDecision = { id, ...data, timestamp: Date.now() }
  localDecisions.unshift(localDecision)
  saveLocalDecisions()
  return id
}

export async function getSessionDecisions(
  sessionId: string
): Promise<(FirestoreSecurityDecision & { id: string })[]> {
  if (isFirebaseLive()) {
    try {
      const q = query(
        collection(db, COLLECTIONS.SECURITY_DECISIONS),
        where('sessionId', '==', sessionId),
        orderBy('timestamp', 'desc')
      )
      const snap = await getDocs(q)
      if (snap.docs.length > 0) {
        return snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as FirestoreSecurityDecision),
        }))
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code !== 'permission-denied') {
        throw err
      }
    }
  }
  return localDecisions.filter((d) => d.sessionId === sessionId)
}

export async function getUserDecisions(
  userId: string,
  limitCount = 50
): Promise<(FirestoreSecurityDecision & { id: string })[]> {
  if (isFirebaseLive()) {
    try {
      const q = query(
        collection(db, COLLECTIONS.SECURITY_DECISIONS),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      )
      const snap = await getDocs(q)
      if (snap.docs.length > 0) {
        return snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as FirestoreSecurityDecision),
        }))
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code !== 'permission-denied') {
        throw err
      }
    }
  }
  return localDecisions.filter((d) => d.userId === userId).slice(0, limitCount)
}

// ── Security Events ────────────────────────────────────────────────────────
export async function recordSecurityEvent(data: FirestoreSecurityEvent): Promise<string> {
  const sanitized: Record<string, unknown> = {}
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined) sanitized[k] = v
  })

  if (isFirebaseLive()) {
    try {
      const ref = await addDoc(collection(db, COLLECTIONS.SECURITY_EVENTS), {
        ...sanitized,
        timestamp: serverTimestamp(),
      })
      const eventWithId = { id: ref.id, ...data, timestamp: Date.now() }
      localEvents.unshift(eventWithId)
      saveLocalEvents()
      return ref.id
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === 'permission-denied') {
        const id = `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        const localEvent = { id, ...data, timestamp: Date.now() }
        localEvents.unshift(localEvent)
        saveLocalEvents()
        return id
      }
      throw err
    }
  }
  const id = `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const localEvent = { id, ...data, timestamp: Date.now() }
  localEvents.unshift(localEvent)
  saveLocalEvents()
  return id
}

export async function getUserSecurityEvents(
  userId: string,
  limitCount = 50
): Promise<(FirestoreSecurityEvent & { id: string })[]> {
  if (isFirebaseLive()) {
    try {
      const q = query(
        collection(db, COLLECTIONS.SECURITY_EVENTS),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      )
      const snap = await getDocs(q)
      if (snap.docs.length > 0) {
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreSecurityEvent) }))
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code !== 'permission-denied') {
        throw err
      }
    }
  }
  return localEvents.filter((e) => e.userId === userId).slice(0, limitCount)
}

export async function getSessionEvents(
  sessionId: string
): Promise<(FirestoreSecurityEvent & { id: string })[]> {
  if (isFirebaseLive()) {
    try {
      const q = query(
        collection(db, COLLECTIONS.SECURITY_EVENTS),
        where('sessionId', '==', sessionId),
        orderBy('timestamp', 'asc')
      )
      const snap = await getDocs(q)
      if (snap.docs.length > 0) {
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreSecurityEvent) }))
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code !== 'permission-denied') {
        throw err
      }
    }
  }
  return localEvents.filter((e) => e.sessionId === sessionId)
}

// ── Dashboard Stats ────────────────────────────────────────────────────────
export async function getDashboardStats(userId: string): Promise<{
  totalSessions: number
  totalToolExecutions: number
  blockedActions: number
  allowedActions: number
  approvalRequired: number
  criticalAlerts: number
}> {
  if (isFirebaseLive()) {
    try {
      const [sessionsSnap, decisionsSnap, criticalSnap] = await Promise.all([
        getDocs(
          query(collection(db, COLLECTIONS.AGENT_SESSIONS), where('userId', '==', userId))
        ),
        getDocs(
          query(collection(db, COLLECTIONS.SECURITY_DECISIONS), where('userId', '==', userId))
        ),
        getDocs(
          query(
            collection(db, COLLECTIONS.SECURITY_EVENTS),
            where('userId', '==', userId),
            where('severity', '==', 'CRITICAL')
          )
        ),
      ])

      const decisions = decisionsSnap.docs.map((d) => d.data() as DocumentData)
      const blocked = decisions.filter((d) => d['decision'] === 'BLOCK').length
      const allowed = decisions.filter((d) => d['decision'] === 'ALLOW').length
      const approval = decisions.filter((d) => d['decision'] === 'APPROVAL_REQUIRED').length

      if (sessionsSnap.size > 0 || decisionsSnap.size > 0 || criticalSnap.size > 0) {
        return {
          totalSessions: sessionsSnap.size,
          totalToolExecutions: decisions.length,
          blockedActions: blocked,
          allowedActions: allowed,
          approvalRequired: approval,
          criticalAlerts: criticalSnap.size,
        }
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code !== 'permission-denied') {
        throw err
      }
    }
  }

  // Calculate from persistent local buffer
  const userDecisions = localDecisions.filter((d) => d.userId === userId)
  const blocked = userDecisions.filter((d) => d.decision === 'BLOCK').length
  const allowed = userDecisions.filter((d) => d.decision === 'ALLOW').length
  const approval = userDecisions.filter((d) => d.decision === 'APPROVAL_REQUIRED').length
  const critical = localEvents.filter((e) => e.userId === userId && e.severity === 'CRITICAL').length

  return {
    totalSessions: localSessions.filter((s) => s.userId === userId).length,
    totalToolExecutions: userDecisions.length,
    blockedActions: blocked,
    allowedActions: allowed,
    approvalRequired: approval,
    criticalAlerts: critical,
  }
}

// ── Real-time Subscriptions ────────────────────────────────────────────────
export function subscribeToSessionEvents(
  sessionId: string,
  callback: (events: (FirestoreSecurityEvent & { id: string })[]) => void
): () => void {
  if (isFirebaseLive()) {
    try {
      const q = query(
        collection(db, COLLECTIONS.SECURITY_EVENTS),
        where('sessionId', '==', sessionId),
        orderBy('timestamp', 'desc'),
        limit(30)
      )

      return onSnapshot(
        q,
        (snap: QuerySnapshot) => {
          const events = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as FirestoreSecurityEvent),
          }))
          callback(events)
        },
        () => {
          // Fallback on permission error
          callback(localEvents.filter((e) => e.sessionId === sessionId))
        }
      )
    } catch {
      // Fallback
    }
  }

  // Return initial matching events
  callback(localEvents.filter((e) => e.sessionId === sessionId))
  return () => {}
}

/**
 * Resets local demo buffer for a given user or entirely.
 * Safely clears isolated demonstration records without mutating production Cloud Firestore.
 */
export function resetDemoBuffer(userId?: string): void {
  if (userId) {
    for (let i = localSessions.length - 1; i >= 0; i--) {
      if (localSessions[i].userId === userId) localSessions.splice(i, 1)
    }
    for (let i = localTraces.length - 1; i >= 0; i--) {
      if (localTraces[i].userId === userId) localTraces.splice(i, 1)
    }
    for (let i = localDecisions.length - 1; i >= 0; i--) {
      if (localDecisions[i].userId === userId) localDecisions.splice(i, 1)
    }
    for (let i = localEvents.length - 1; i >= 0; i--) {
      if (localEvents[i].userId === userId) localEvents.splice(i, 1)
    }
  } else {
    localSessions.length = 0
    localTraces.length = 0
    localDecisions.length = 0
    localEvents.length = 0
  }

  persistBuffer(SESSIONS_KEY, localSessions)
  persistBuffer(TRACES_KEY, localTraces)
  persistBuffer(DECISIONS_KEY, localDecisions)
  persistBuffer(EVENTS_KEY, localEvents)
}
