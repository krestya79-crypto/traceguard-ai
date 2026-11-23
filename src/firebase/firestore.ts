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

// ── In-Memory buffer (active when Firebase credentials are not yet configured) ──
const localSessions: (FirestoreSession & { id: string })[] = []
const localTraces: (FirestoreTraceEvent & { id: string })[] = []
const localDecisions: (FirestoreSecurityDecision & { id: string })[] = []
const localEvents: (FirestoreSecurityEvent & { id: string })[] = []
const localUsers: Map<string, FirestoreUser & { id: string }> = new Map()

// ── Users ──────────────────────────────────────────────────────────────────
export async function upsertUser(userId: string, data: Partial<FirestoreUser>): Promise<void> {
  if (isFirebaseLive()) {
    const ref = doc(db, COLLECTIONS.USERS, userId)
    await setDoc(ref, { ...data, lastActiveAt: serverTimestamp() }, { merge: true })
  } else {
    const existing = localUsers.get(userId) || {
      id: userId,
      email: data.email || 'operator@traceguard.ai',
      displayName: data.displayName || 'Security Operator',
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    }
    localUsers.set(userId, { ...existing, ...data, lastActiveAt: Date.now() })
  }
}

export async function getUser(userId: string): Promise<(FirestoreUser & { id: string }) | null> {
  if (isFirebaseLive()) {
    const ref = doc(db, COLLECTIONS.USERS, userId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return { id: snap.id, ...(snap.data() as FirestoreUser) }
  }
  return localUsers.get(userId) || null
}

// ── Agent Sessions ─────────────────────────────────────────────────────────
export async function createSession(data: FirestoreSession): Promise<string> {
  if (isFirebaseLive()) {
    const ref = await addDoc(collection(db, COLLECTIONS.AGENT_SESSIONS), {
      ...data,
      startedAt: serverTimestamp(),
    })
    return ref.id
  }
  const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  localSessions.unshift({ id, ...data, startedAt: Date.now() })
  return id
}

export async function updateSession(
  sessionId: string,
  data: Partial<FirestoreSession>
): Promise<void> {
  if (isFirebaseLive()) {
    const ref = doc(db, COLLECTIONS.AGENT_SESSIONS, sessionId)
    await setDoc(ref, data, { merge: true })
  } else {
    const idx = localSessions.findIndex((s) => s.id === sessionId)
    if (idx !== -1) {
      localSessions[idx] = { ...localSessions[idx], ...data }
    }
  }
}

export async function getSession(
  sessionId: string
): Promise<(FirestoreSession & { id: string }) | null> {
  if (isFirebaseLive()) {
    const ref = doc(db, COLLECTIONS.AGENT_SESSIONS, sessionId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return { id: snap.id, ...(snap.data() as FirestoreSession) }
  }
  return localSessions.find((s) => s.id === sessionId) || null
}

export async function getUserSessions(
  userId: string,
  limitCount = 20
): Promise<(FirestoreSession & { id: string })[]> {
  if (isFirebaseLive()) {
    const q = query(
      collection(db, COLLECTIONS.AGENT_SESSIONS),
      where('userId', '==', userId),
      orderBy('startedAt', 'desc'),
      limit(limitCount)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreSession) }))
  }
  return localSessions.filter((s) => s.userId === userId).slice(0, limitCount)
}

// ── Execution Traces ───────────────────────────────────────────────────────
export async function recordTraceEvent(data: FirestoreTraceEvent): Promise<string> {
  if (isFirebaseLive()) {
    // Sanitize undefined fields
    const sanitized: Record<string, unknown> = {}
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined) sanitized[k] = v
    })
    const ref = await addDoc(collection(db, COLLECTIONS.EXECUTION_TRACES), {
      ...sanitized,
      timestamp: serverTimestamp(),
    })
    return ref.id
  }
  const id = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  localTraces.push({ id, ...data, timestamp: Date.now() })
  return id
}

export async function getSessionTraces(
  sessionId: string
): Promise<(FirestoreTraceEvent & { id: string })[]> {
  if (isFirebaseLive()) {
    const q = query(
      collection(db, COLLECTIONS.EXECUTION_TRACES),
      where('sessionId', '==', sessionId),
      orderBy('timestamp', 'asc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreTraceEvent) }))
  }
  return localTraces.filter((t) => t.sessionId === sessionId)
}

// ── Security Decisions ─────────────────────────────────────────────────────
export async function recordSecurityDecision(
  data: FirestoreSecurityDecision
): Promise<string> {
  if (isFirebaseLive()) {
    const sanitized: Record<string, unknown> = {}
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined) sanitized[k] = v
    })
    const ref = await addDoc(collection(db, COLLECTIONS.SECURITY_DECISIONS), {
      ...sanitized,
      timestamp: serverTimestamp(),
    })
    return ref.id
  }
  const id = `decision_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  localDecisions.push({ id, ...data, timestamp: Date.now() })
  return id
}

export async function getSessionDecisions(
  sessionId: string
): Promise<(FirestoreSecurityDecision & { id: string })[]> {
  if (isFirebaseLive()) {
    const q = query(
      collection(db, COLLECTIONS.SECURITY_DECISIONS),
      where('sessionId', '==', sessionId),
      orderBy('timestamp', 'desc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as FirestoreSecurityDecision),
    }))
  }
  return localDecisions.filter((d) => d.sessionId === sessionId)
}

export async function getUserDecisions(
  userId: string,
  limitCount = 50
): Promise<(FirestoreSecurityDecision & { id: string })[]> {
  if (isFirebaseLive()) {
    const q = query(
      collection(db, COLLECTIONS.SECURITY_DECISIONS),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as FirestoreSecurityDecision),
    }))
  }
  return localDecisions.filter((d) => d.userId === userId).slice(0, limitCount)
}

// ── Security Events ────────────────────────────────────────────────────────
export async function recordSecurityEvent(data: FirestoreSecurityEvent): Promise<string> {
  if (isFirebaseLive()) {
    const sanitized: Record<string, unknown> = {}
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined) sanitized[k] = v
    })
    const ref = await addDoc(collection(db, COLLECTIONS.SECURITY_EVENTS), {
      ...sanitized,
      timestamp: serverTimestamp(),
    })
    return ref.id
  }
  const id = `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  localEvents.push({ id, ...data, timestamp: Date.now() })
  return id
}

export async function getUserSecurityEvents(
  userId: string,
  limitCount = 50
): Promise<(FirestoreSecurityEvent & { id: string })[]> {
  if (isFirebaseLive()) {
    const q = query(
      collection(db, COLLECTIONS.SECURITY_EVENTS),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreSecurityEvent) }))
  }
  return localEvents.filter((e) => e.userId === userId).slice(0, limitCount)
}

export async function getSessionEvents(
  sessionId: string
): Promise<(FirestoreSecurityEvent & { id: string })[]> {
  if (isFirebaseLive()) {
    const q = query(
      collection(db, COLLECTIONS.SECURITY_EVENTS),
      where('sessionId', '==', sessionId),
      orderBy('timestamp', 'asc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreSecurityEvent) }))
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

    return {
      totalSessions: sessionsSnap.size,
      totalToolExecutions: decisions.length,
      blockedActions: blocked,
      allowedActions: allowed,
      approvalRequired: approval,
      criticalAlerts: criticalSnap.size,
    }
  }

  // Calculate from local buffer
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
    const q = query(
      collection(db, COLLECTIONS.SECURITY_EVENTS),
      where('sessionId', '==', sessionId),
      orderBy('timestamp', 'desc'),
      limit(30)
    )

    return onSnapshot(q, (snap: QuerySnapshot) => {
      const events = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as FirestoreSecurityEvent),
      }))
      callback(events)
    })
  }

  // Return initial matching events
  callback(localEvents.filter((e) => e.sessionId === sessionId))
  return () => {}
}

export function subscribeToUserSessions(
  userId: string,
  callback: (sessions: (FirestoreSession & { id: string })[]) => void
): () => void {
  if (isFirebaseLive()) {
    const q = query(
      collection(db, COLLECTIONS.AGENT_SESSIONS),
      where('userId', '==', userId),
      orderBy('startedAt', 'desc'),
      limit(10)
    )

    return onSnapshot(q, (snap: QuerySnapshot) => {
      const sessions = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as FirestoreSession),
      }))
      callback(sessions)
    })
  }

  callback(localSessions.filter((s) => s.userId === userId))
  return () => {}
}
