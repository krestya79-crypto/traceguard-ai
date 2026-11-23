export enum TrustLevel {
  TRUSTED_USER = 'TRUSTED_USER',
  SYSTEM = 'SYSTEM',
  UNTRUSTED_EXTERNAL = 'UNTRUSTED_EXTERNAL',
  TOOL_OUTPUT = 'TOOL_OUTPUT',
  DERIVED = 'DERIVED',
}

export enum EnforcementDecision {
  ALLOW = 'ALLOW',
  BLOCK = 'BLOCK',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
}

export enum InferenceRoute {
  ON_DEVICE = 'ON_DEVICE',
  CLOUD = 'CLOUD',
  FALLBACK = 'FALLBACK',
  UNKNOWN = 'UNKNOWN',
}

export interface ProvenanceNode {
  id: string;
  type: 'USER_INSTRUCTION' | 'SYSTEM_INSTRUCTION' | 'EXTERNAL_DOCUMENT' | 'TOOL_OUTPUT' | 'AGENT_DERIVATION';
  trustLevel: TrustLevel;
  content: string;
  source: string;
  timestamp: number;
  parentIds: string[];
}

export interface TaintLabel {
  nodeId: string;
  tainted: boolean;
  taintReason?: string;
  propagatedFrom?: string[];
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  condition: (ctx: PolicyEvaluationContext) => boolean;
  decision: EnforcementDecision;
  priority: number;
}

export interface PolicyEvaluationContext {
  proposedAction: ProposedToolAction;
  contract: ExecutionContract;
  taintLabels: TaintLabel[];
  provenanceChain: ProvenanceNode[];
  aiRiskSignal?: AIRiskSignal;
}

export interface ProposedToolAction {
  id: string;
  toolName: string;
  parameters: Record<string, unknown>;
  initiatedByNodeId: string;
  sessionId: string;
  timestamp: number;
}

export interface ExecutionContract {
  id: string;
  sessionId: string;
  userGoal: string;
  allowedTools: string[];
  allowedRecipients: string[];
  restrictedDataCategories: string[];
  externalExportPermitted: boolean;
  createdAt: number;
  userId: string;
}

export interface AIRiskSignal {
  riskScore: number; // 0-1
  flags: string[];
  reasoning: string;
  inferenceRoute: InferenceRoute;
  modelUsed: string;
  analysisType: 'ON_DEVICE_ANALYSIS' | 'CLOUD_ANALYSIS';
}

export interface SecurityDecision {
  id: string;
  sessionId: string;
  proposedAction: ProposedToolAction;
  decision: EnforcementDecision;
  policyRuleTriggered?: string;
  aiRiskSignal?: AIRiskSignal;
  reasoning: string;
  timestamp: number;
  userId: string;
}

export interface SecurityEvent {
  id: string;
  sessionId: string;
  type: 'PROMPT_INJECTION_DETECTED' | 'TAINT_PROPAGATION' | 'POLICY_VIOLATION' | 'TOOL_BLOCKED' | 'TOOL_ALLOWED' | 'CONTRACT_VIOLATION' | 'SUSPICIOUS_INSTRUCTION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  nodeId?: string;
  timestamp: number;
  userId: string;
}
