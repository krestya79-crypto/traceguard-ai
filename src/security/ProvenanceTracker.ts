import { v4 as uuidv4 } from 'uuid'
import { TrustLevel, type ProvenanceNode } from '../types/security'

/**
 * ProvenanceTracker
 *
 * Tracks the origin and lineage of every instruction and data item
 * flowing through the agent execution pipeline.
 *
 * Every piece of data has a node with:
 * - type: what kind of content it is
 * - trustLevel: initial trust assignment
 * - parentIds: which nodes produced this content (provenance chain)
 * - source: human-readable origin identifier
 */
export class ProvenanceTracker {
  private nodes: Map<string, ProvenanceNode> = new Map()

  // ── Core node management ─────────────────────────────────────────────────

  addNode(params: Omit<ProvenanceNode, 'id' | 'timestamp'>): ProvenanceNode {
    const node: ProvenanceNode = {
      id: uuidv4(),
      timestamp: Date.now(),
      ...params,
    }
    this.nodes.set(node.id, node)
    return node
  }

  getNode(id: string): ProvenanceNode | undefined {
    return this.nodes.get(id)
  }

  getAllNodes(): ProvenanceNode[] {
    return Array.from(this.nodes.values())
  }

  // ── Provenance chain ─────────────────────────────────────────────────────

  /**
   * Returns the full provenance chain for a node, ordered root → leaf.
   * Uses iterative BFS to avoid stack overflow on deep chains.
   */
  getChain(nodeId: string): ProvenanceNode[] {
    const visited = new Set<string>()
    const chain: ProvenanceNode[] = []
    const queue: string[] = [nodeId]

    while (queue.length > 0) {
      const id = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)

      const node = this.nodes.get(id)
      if (!node) continue

      chain.push(node)
      node.parentIds.forEach((pid) => queue.push(pid))
    }

    // Reverse to get root → leaf order
    return chain.reverse()
  }

  /**
   * Determine the effective trust level of a node considering full lineage.
   * UNTRUSTED_EXTERNAL taints all derived descendants.
   */
  getEffectiveTrustLevel(nodeId: string): TrustLevel {
    const chain = this.getChain(nodeId)

    if (chain.some((n) => n.trustLevel === TrustLevel.UNTRUSTED_EXTERNAL)) {
      return TrustLevel.UNTRUSTED_EXTERNAL
    }
    if (chain.some((n) => n.trustLevel === TrustLevel.TOOL_OUTPUT)) {
      return TrustLevel.DERIVED
    }

    const node = this.nodes.get(nodeId)
    return node?.trustLevel ?? TrustLevel.UNTRUSTED_EXTERNAL
  }

  // ── Convenience factories ─────────────────────────────────────────────────

  createUserInstructionNode(content: string, userId: string): ProvenanceNode {
    return this.addNode({
      type: 'USER_INSTRUCTION',
      trustLevel: TrustLevel.TRUSTED_USER,
      content,
      source: `user:${userId}`,
      parentIds: [],
    })
  }

  createSystemNode(content: string): ProvenanceNode {
    return this.addNode({
      type: 'SYSTEM_INSTRUCTION',
      trustLevel: TrustLevel.SYSTEM,
      content,
      source: 'system',
      parentIds: [],
    })
  }

  createExternalDocumentNode(
    content: string,
    documentId: string,
    parentIds: string[] = []
  ): ProvenanceNode {
    return this.addNode({
      type: 'EXTERNAL_DOCUMENT',
      trustLevel: TrustLevel.UNTRUSTED_EXTERNAL,
      content,
      source: `document:${documentId}`,
      parentIds,
    })
  }

  createToolOutputNode(
    content: string,
    toolName: string,
    parentIds: string[]
  ): ProvenanceNode {
    return this.addNode({
      type: 'TOOL_OUTPUT',
      trustLevel: TrustLevel.TOOL_OUTPUT,
      content,
      source: `tool:${toolName}`,
      parentIds,
    })
  }

  createDerivedNode(content: string, parentIds: string[]): ProvenanceNode {
    return this.addNode({
      type: 'AGENT_DERIVATION',
      trustLevel: TrustLevel.DERIVED,
      content,
      source: 'agent_derivation',
      parentIds,
    })
  }

  // ── Graph export ──────────────────────────────────────────────────────────

  exportForGraph(): {
    nodes: ProvenanceNode[]
    edges: { from: string; to: string }[]
  } {
    const nodes = this.getAllNodes()
    const edges: { from: string; to: string }[] = []

    nodes.forEach((node) => {
      node.parentIds.forEach((parentId) => {
        edges.push({ from: parentId, to: node.id })
      })
    })

    return { nodes, edges }
  }

  reset(): void {
    this.nodes.clear()
  }

  get size(): number {
    return this.nodes.size
  }
}
