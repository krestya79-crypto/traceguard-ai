// Firestore document shapes (without id field, as that's the doc reference)
export interface FirestoreUser {
  email: string;
  displayName: string;
  createdAt: number;
  lastActiveAt: number;
}

export interface FirestoreSession {
  userId: string;
  goal: string;
  status: 'RUNNING' | 'COMPLETED' | 'BLOCKED' | 'FAILED';
  contractId: string;
  startedAt: number;
  completedAt?: number;
  eventCount: number;
  blockedActions: number;
  allowedActions: number;
}

export interface FirestoreTraceEvent {
  sessionId: string;
  type: string;
  description: string;
  trustLevel?: string;
  provenanceNodeId?: string;
  securityDecisionId?: string;
  data?: Record<string, unknown>;
  timestamp: number;
  userId: string;
}

export interface FirestoreSecurityDecision {
  sessionId: string;
  proposedAction: Record<string, unknown>;
  decision: string;
  policyRuleTriggered?: string;
  aiRiskSignal?: Record<string, unknown>;
  reasoning: string;
  timestamp: number;
  userId: string;
}

export interface FirestoreSecurityEvent {
  sessionId: string;
  type: string;
  severity: string;
  description: string;
  nodeId?: string;
  timestamp: number;
  userId: string;
}
