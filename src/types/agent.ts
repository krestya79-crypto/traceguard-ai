import { TrustLevel, SecurityDecision } from './security';

export interface AgentSession {
  id: string;
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

export interface TraceEvent {
  id: string;
  sessionId: string;
  type: 'AGENT_START' | 'TOOL_PROPOSED' | 'TOOL_EXECUTED' | 'TOOL_BLOCKED' | 'DOCUMENT_READ' | 'TAINT_DETECTED' | 'SECURITY_CHECK' | 'AGENT_COMPLETE';
  description: string;
  trustLevel?: TrustLevel;
  provenanceNodeId?: string;
  securityDecisionId?: string;
  data?: Record<string, unknown>;
  timestamp: number;
  userId: string;
  sessionId_timestamp_index?: string;
}

export interface SandboxDocument {
  id: string;
  title: string;
  content: string;
  trustLevel: TrustLevel;
  tags: string[];
  containsMaliciousInstructions?: boolean;
  maliciousPayload?: string;
}

export interface ToolCallResult {
  success: boolean;
  output?: unknown;
  error?: string;
  blocked?: boolean;
  securityDecision?: SecurityDecision;
}
