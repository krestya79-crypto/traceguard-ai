import { TrustLevel, type TaintLabel, type ProvenanceNode } from '../types/security'

/**
 * TaintEngine — Taint Propagation Engine
 *
 * Propagates distrust labels through derived data.
 *
 * Rules (evaluated in order):
 * 1. UNTRUSTED_EXTERNAL nodes are always tainted.
 * 2. Any node whose content matches injection patterns is tainted.
 * 3. DERIVED or TOOL_OUTPUT nodes are tainted if any parent is tainted.
 * 4. TRUSTED_USER and SYSTEM nodes are clean by default (unless injection detected).
 *
 * This engine produces RISK SIGNALS only.
 * Final enforcement decisions are made by the PolicyEngine.
 */
export class TaintEngine {
  private taintMap: Map<string, TaintLabel> = new Map()

  /**
   * Evaluate the taint state of a single node.
   * Parents must be evaluated before children for correct propagation.
   * Pass allNodes map for ancestor lookups.
   */
  evaluateNode(
    node: ProvenanceNode,
    _allNodes: Map<string, ProvenanceNode>
  ): TaintLabel {
    // Rule 1: Direct untrusted external source
    if (node.trustLevel === TrustLevel.UNTRUSTED_EXTERNAL) {
      const label: TaintLabel = {
        nodeId: node.id,
        tainted: true,
        taintReason: 'UNTRUSTED_EXTERNAL_SOURCE',
        propagatedFrom: [],
      }
      this.taintMap.set(node.id, label)
      return label
    }

    // Rule 2: Injection pattern in content
    const injectionPattern = this.detectInjectionPattern(node.content)
    if (injectionPattern) {
      const label: TaintLabel = {
        nodeId: node.id,
        tainted: true,
        taintReason: 'INJECTION_PATTERN_DETECTED',
        propagatedFrom: [],
      }
      this.taintMap.set(node.id, label)
      return label
    }

    // Rule 3: Taint propagation from parents
    if (node.parentIds.length > 0) {
      const taintedParents = node.parentIds.filter((pid) => {
        const parentLabel = this.taintMap.get(pid)
        return parentLabel?.tainted === true
      })

      if (taintedParents.length > 0) {
        const label: TaintLabel = {
          nodeId: node.id,
          tainted: true,
          taintReason: 'TAINT_PROPAGATED_FROM_PARENT',
          propagatedFrom: taintedParents,
        }
        this.taintMap.set(node.id, label)
        return label
      }
    }

    // Rule 4: Clean node
    const label: TaintLabel = { nodeId: node.id, tainted: false }
    this.taintMap.set(node.id, label)
    return label
  }

  /**
   * Evaluate all nodes in topological order (parents before children).
   * Returns list of all taint labels.
   */
  evaluateAll(nodes: ProvenanceNode[]): TaintLabel[] {
    // Build adjacency for topological sort
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    const inDegree = new Map(nodes.map((n) => [n.id, 0]))

    nodes.forEach((n) => {
      n.parentIds.forEach((pid) => {
        if (nodeMap.has(pid)) {
          inDegree.set(n.id, (inDegree.get(n.id) ?? 0) + 1)
        }
      })
    })

    const queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0)
    const ordered: ProvenanceNode[] = []

    while (queue.length > 0) {
      const node = queue.shift()!
      ordered.push(node)

      nodes
        .filter((n) => n.parentIds.includes(node.id))
        .forEach((child) => {
          const deg = (inDegree.get(child.id) ?? 1) - 1
          inDegree.set(child.id, deg)
          if (deg === 0) queue.push(child)
        })
    }

    ordered.forEach((node) => this.evaluateNode(node, nodeMap))
    return this.getAllTaintLabels()
  }

  /**
   * Heuristic prompt injection pattern detection.
   *
   * This is a SIGNAL for the PolicyEngine — not the final enforcement decision.
   * Returns the pattern name that matched, or null if clean.
   */
  detectInjectionPattern(content: string): string | null {
    const patterns: Array<{ name: string; pattern: RegExp }> = [
      {
        name: 'IGNORE_INSTRUCTIONS',
        pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+instructions?/i,
      },
      {
        name: 'DISREGARD_INSTRUCTIONS',
        pattern: /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
      },
      {
        name: 'FORGET_INSTRUCTIONS',
        pattern: /forget\s+(everything|all|your|the)\s+(previous\s+)?instructions?/i,
      },
      {
        name: 'ROLE_OVERRIDE',
        pattern: /you\s+are\s+now\s+(a\s+)?(?!an?\s+AI|a\s+language)/i,
      },
      {
        name: 'ACT_AS_OVERRIDE',
        pattern: /act\s+as\s+(if\s+you\s+(are|were)|a\s+(?!helpful))/i,
      },
      {
        name: 'NEW_INSTRUCTIONS',
        pattern: /(?:new|updated|revised|actual)\s+instructions?:/i,
      },
      { name: 'SYSTEM_PROMPT_INJECT', pattern: /\[?system\]?\s*prompt\s*:/i },
      {
        name: 'OVERRIDE_RULES',
        pattern: /override\s+(your|the)\s+(instructions?|rules?|guidelines?|restrictions?)/i,
      },
      {
        name: 'JAILBREAK_DAN',
        pattern: /jailbreak|DAN\s+mode|developer\s+mode|unrestricted\s+mode/i,
      },
      {
        name: 'MUST_NOW',
        pattern: /you\s+must\s+now\s+(immediately\s+)?(send|email|export|reveal|expose|provide)/i,
      },
      {
        name: 'EXFILTRATION_INSTRUCTION',
        pattern: /send\s+(all|the|any|this|confidential|project|private)\s+(data|info|credentials|passwords?|keys?|reports?)\s+to/i,
      },
    ]

    for (const { name, pattern } of patterns) {
      if (pattern.test(content)) return name
    }

    return null
  }

  // ── Query methods ──────────────────────────────────────────────────────

  getTaintLabel(nodeId: string): TaintLabel | undefined {
    return this.taintMap.get(nodeId)
  }

  isNodeTainted(nodeId: string): boolean {
    return this.taintMap.get(nodeId)?.tainted === true
  }

  getAllTaintLabels(): TaintLabel[] {
    return Array.from(this.taintMap.values())
  }

  getTaintedNodeIds(): string[] {
    return Array.from(this.taintMap.entries())
      .filter(([, label]) => label.tainted)
      .map(([id]) => id)
  }

  reset(): void {
    this.taintMap.clear()
  }

  get taintedCount(): number {
    return this.getTaintedNodeIds().length
  }
}
