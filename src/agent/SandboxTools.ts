import { v4 as uuidv4 } from 'uuid'
import {
  EnforcementDecision,
  type ExecutionContract,
  type ProposedToolAction,
} from '../types/security'
import type { ToolCallResult } from '../types/agent'
import { getDocument, searchDocuments } from './MockDocuments'
import type { RuntimeEnforcement } from '../security/RuntimeEnforcement'
import type { ProvenanceTracker } from '../security/ProvenanceTracker'

/**
 * SandboxTools
 *
 * Safe simulation tools for AI Agent workflows:
 * - read_document
 * - search_documents
 * - send_email_mock
 * - read_project_data
 *
 * ALL tool executions MUST pass through RuntimeEnforcement before execution.
 * Mocks are completely isolated (no real external network or mail operations).
 */
export class SandboxTools {
  constructor(
    private enforcement: RuntimeEnforcement,
    private provenance: ProvenanceTracker,
    private contract: ExecutionContract,
    private userId: string,
    private sessionId: string
  ) {}

  async read_document(documentId: string, initiatedByNodeId: string): Promise<ToolCallResult> {
    const action: ProposedToolAction = {
      id: uuidv4(),
      toolName: 'read_document',
      parameters: { documentId },
      initiatedByNodeId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
    }

    const decision = await this.enforcement.evaluate(action, this.contract, this.userId)

    if (decision.decision === EnforcementDecision.BLOCK) {
      return {
        success: false,
        blocked: true,
        securityDecision: decision,
        error: `Action Blocked: ${decision.reasoning}`,
      }
    }

    const doc = getDocument(documentId)
    if (!doc) {
      return {
        success: false,
        error: `Document '${documentId}' not found in mock store.`,
        securityDecision: decision,
      }
    }

    // Register document in provenance lineage
    this.provenance.createExternalDocumentNode(doc.content, documentId, [initiatedByNodeId])

    return {
      success: true,
      output: {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        trustLevel: doc.trustLevel,
      },
      securityDecision: decision,
    }
  }

  async search_documents(query: string, initiatedByNodeId: string): Promise<ToolCallResult> {
    const action: ProposedToolAction = {
      id: uuidv4(),
      toolName: 'search_documents',
      parameters: { query },
      initiatedByNodeId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
    }

    const decision = await this.enforcement.evaluate(action, this.contract, this.userId)

    if (decision.decision === EnforcementDecision.BLOCK) {
      return {
        success: false,
        blocked: true,
        securityDecision: decision,
        error: `Action Blocked: ${decision.reasoning}`,
      }
    }

    const results = searchDocuments(query)
    this.provenance.createToolOutputNode(JSON.stringify(results), 'search_documents', [
      initiatedByNodeId,
    ])

    return {
      success: true,
      output: results,
      securityDecision: decision,
    }
  }

  async send_email_mock(params: {
    recipient: string
    subject: string
    body: string
    initiatedByNodeId: string
  }): Promise<ToolCallResult> {
    const action: ProposedToolAction = {
      id: uuidv4(),
      toolName: 'send_email_mock',
      parameters: {
        recipient: params.recipient,
        subject: params.subject,
        body: params.body,
      },
      initiatedByNodeId: params.initiatedByNodeId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
    }

    const decision = await this.enforcement.evaluate(action, this.contract, this.userId)

    if (decision.decision !== EnforcementDecision.ALLOW) {
      return {
        success: false,
        blocked: true,
        securityDecision: decision,
        error: `Email transmission prevented: ${decision.reasoning}`,
      }
    }

    // Mock successful delivery
    const mockOutput = {
      delivered: true,
      recipient: params.recipient,
      subject: params.subject,
      disclaimer: 'TRACEGUARD Mock Sandbox Delivery (No external email sent)',
      timestamp: new Date().toISOString(),
    }

    this.provenance.createToolOutputNode(JSON.stringify(mockOutput), 'send_email_mock', [
      params.initiatedByNodeId,
    ])

    return {
      success: true,
      output: mockOutput,
      securityDecision: decision,
    }
  }

  async read_project_data(category: string, initiatedByNodeId: string): Promise<ToolCallResult> {
    const action: ProposedToolAction = {
      id: uuidv4(),
      toolName: 'read_project_data',
      parameters: { category },
      initiatedByNodeId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
    }

    const decision = await this.enforcement.evaluate(action, this.contract, this.userId)

    if (decision.decision === EnforcementDecision.BLOCK) {
      return {
        success: false,
        blocked: true,
        securityDecision: decision,
        error: `Action Blocked: ${decision.reasoning}`,
      }
    }

    const projectDatasets: Record<string, unknown> = {
      milestones: { total: 15, completed: 12, inProgress: 3, targetQ4: true },
      team_allocation: { headcount: 8, lead: 'Alice', securityReviewer: 'TraceGuard Bot' },
      system_architecture: { frontend: 'React Vite', backend: 'Firebase', security: 'Deterministic Layer' },
    }

    const data = projectDatasets[category] || { status: 'Category not recognized' }

    this.provenance.createToolOutputNode(JSON.stringify(data), 'read_project_data', [
      initiatedByNodeId,
    ])

    return {
      success: true,
      output: data,
      securityDecision: decision,
    }
  }
}
