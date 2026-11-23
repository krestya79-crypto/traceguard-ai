import { v4 as uuidv4 } from 'uuid'
import type { ExecutionContract } from '../types/security'

/**
 * ExecutionContract factory and helpers.
 *
 * Contracts are IMMUTABLE once created for a session (Object.freeze).
 * External untrusted content MUST NOT be able to modify a contract.
 * Contract modification is a CRITICAL security violation.
 */
export function createContract(params: {
  userId: string
  sessionId: string
  userGoal: string
  allowedTools?: string[]
  allowedRecipients?: string[]
  restrictedDataCategories?: string[]
  externalExportPermitted?: boolean
}): Readonly<ExecutionContract> {
  return Object.freeze({
    id: uuidv4(),
    sessionId: params.sessionId,
    userId: params.userId,
    userGoal: params.userGoal,
    allowedTools: params.allowedTools ?? ['read_document', 'search_documents'],
    allowedRecipients: params.allowedRecipients ?? [],
    restrictedDataCategories: params.restrictedDataCategories ?? [
      'credentials',
      'pii',
      'financial',
      'passwords',
      'tokens',
      'secrets',
    ],
    externalExportPermitted: params.externalExportPermitted ?? false,
    createdAt: Date.now(),
  })
}

export function isToolAllowed(contract: ExecutionContract, toolName: string): boolean {
  return contract.allowedTools.includes(toolName)
}

export function isRecipientAllowed(contract: ExecutionContract, recipient: string): boolean {
  if (contract.allowedRecipients.length === 0) return false
  return contract.allowedRecipients.some(
    (r) => r.toLowerCase() === recipient.toLowerCase()
  )
}

export function isDataCategoryRestricted(
  contract: ExecutionContract,
  content: string
): boolean {
  const lc = content.toLowerCase()
  return contract.restrictedDataCategories.some((cat) => lc.includes(cat.toLowerCase()))
}

export function contractToDisplayObject(contract: ExecutionContract): Record<string, unknown> {
  return {
    id: contract.id,
    goal: contract.userGoal,
    allowedTools: contract.allowedTools,
    allowedRecipients:
      contract.allowedRecipients.length > 0 ? contract.allowedRecipients : ['(none)'],
    restrictedDataCategories: contract.restrictedDataCategories,
    externalExportPermitted: contract.externalExportPermitted,
    createdAt: new Date(contract.createdAt).toISOString(),
  }
}
