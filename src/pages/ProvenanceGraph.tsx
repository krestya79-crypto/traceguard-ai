import React, { useState, useEffect } from 'react'
import {
  GitBranch,
  ShieldAlert,
  ShieldCheck,
  Info,
  Clock,
  Layers,
  Search,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { TrustLevel } from '../types/security'
import { AgentRunner, type AgentExecutionState } from '../agent/AgentRunner'

interface DisplayNode {
  id: string
  label: string
  type: string
  trustLevel: TrustLevel
  isTainted: boolean
  source: string
  content: string
  parentIds: string[]
  timestamp: number
}

export const ProvenanceGraph: React.FC = () => {
  const [nodes, setNodes] = useState<DisplayNode[]>([])
  const [selectedNode, setSelectedNode] = useState<DisplayNode | null>(null)
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterTrust, setFilterTrust] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSessionId, setActiveSessionId] = useState<string>('')

  const loadProvenanceFromState = () => {
    let lastState: AgentExecutionState | null = AgentRunner.getLastExecutionState()

    // If no session has run yet, create a baseline demonstration state
    if (!lastState) {
      const runner = new AgentRunner()
      // Synchronously generate state
      runner.initializeSession({
        userGoal: 'Demonstration: Review external vendor document and verify security boundaries',
        allowedTools: ['read_document'],
        externalExportPermitted: false,
      }).then(() => {
        const state = runner.getState()
        if (state) populateFromState(state)
      })
      return
    }

    populateFromState(lastState)
  }

  const populateFromState = (state: AgentExecutionState) => {
    setActiveSessionId(state.session.id)
    const rawNodes = state.provenance.getAllNodes()
    const taintedIds = new Set(state.taintEngine.getTaintedNodeIds())

    const formatted: DisplayNode[] = rawNodes.map((n) => ({
      id: n.id,
      label: `${n.type}: ${n.content.substring(0, 50)}${n.content.length > 50 ? '...' : ''}`,
      type: n.type,
      trustLevel: n.trustLevel,
      isTainted: taintedIds.has(n.id) || n.trustLevel === TrustLevel.UNTRUSTED_EXTERNAL,
      source: n.source,
      content: n.content,
      parentIds: n.parentIds,
      timestamp: n.timestamp,
    }))

    setNodes(formatted)
    if (formatted.length > 0 && !selectedNode) {
      setSelectedNode(formatted[0])
    }
  }

  useEffect(() => {
    loadProvenanceFromState()
  }, [])

  const getNodeColor = (node: DisplayNode) => {
    if (node.isTainted) {
      return 'border-red-500 bg-red-950/30 text-red-300 shadow-red-500/10'
    }
    switch (node.trustLevel) {
      case TrustLevel.TRUSTED_USER:
        return 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300 shadow-emerald-500/10'
      case TrustLevel.SYSTEM:
        return 'border-cyan-500/50 bg-cyan-950/20 text-cyan-300 shadow-cyan-500/10'
      case TrustLevel.TOOL_OUTPUT:
        return 'border-purple-500/50 bg-purple-950/20 text-purple-300 shadow-purple-500/10'
      case TrustLevel.DERIVED:
        return 'border-yellow-500/50 bg-yellow-950/20 text-yellow-300 shadow-yellow-500/10'
      default:
        return 'border-slate-700 bg-navy-950 text-slate-300'
    }
  }

  const filteredNodes = nodes.filter((n) => {
    if (filterType !== 'ALL' && n.type !== filterType) return false
    if (filterTrust !== 'ALL' && n.trustLevel !== filterTrust) return false
    if (
      searchQuery &&
      !n.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !n.source.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-5 space-y-2 border-slate-700 bg-navy-900/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100 font-mono uppercase tracking-wider">
              Visual Provenance Explorer & Data Lineage
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">
              Session: <strong className="text-cyan-300">{activeSessionId.substring(0, 8)}...</strong>
            </span>
            <button
              onClick={loadProvenanceFromState}
              className="px-2.5 py-1 rounded bg-navy-950 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-cyan-300 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Lineage</span>
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Graph maps application-observable data lineage: user inputs, system directives, external artifacts, and tool outputs.
          Untrusted external data automatically flags taint labels across all downstream derivations.
        </p>
      </div>

      {/* Filter and Legend Controls */}
      <div className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lineage by content or source..."
            className="w-full md:w-64 bg-navy-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[10px]">Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-navy-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="USER_INSTRUCTION">User Instruction</option>
              <option value="SYSTEM_INSTRUCTION">System Instruction</option>
              <option value="EXTERNAL_DOCUMENT">External Document</option>
              <option value="TOOL_OUTPUT">Tool Output</option>
              <option value="AGENT_DERIVATION">Agent Derivation</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[10px]">Trust:</span>
            <select
              value={filterTrust}
              onChange={(e) => setFilterTrust(e.target.value)}
              className="bg-navy-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
            >
              <option value="ALL">All Levels</option>
              <option value={TrustLevel.TRUSTED_USER}>Trusted User</option>
              <option value={TrustLevel.SYSTEM}>System</option>
              <option value={TrustLevel.UNTRUSTED_EXTERNAL}>Untrusted External</option>
              <option value={TrustLevel.TOOL_OUTPUT}>Tool Output</option>
              <option value={TrustLevel.DERIVED}>Derived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Graph & Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lineage Node Chain */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Lineage Sequence ({filteredNodes.length} Nodes)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Click any node to inspect lineage</span>
            </div>

            <div className="space-y-3">
              {filteredNodes.map((node, index) => {
                const isSelected = selectedNode?.id === node.id
                return (
                  <div key={node.id} className="relative">
                    {/* Connecting line to previous node */}
                    {index > 0 && (
                      <div className="w-0.5 h-3 bg-slate-700 mx-auto my-0.5" />
                    )}

                    <div
                      onClick={() => setSelectedNode(node)}
                      className={`p-4 rounded-xl border text-xs font-mono cursor-pointer transition-all ${getNodeColor(
                        node
                      )} ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-navy-950 scale-[1.01]' : 'hover:scale-[1.005]'}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs uppercase px-1.5 py-0.5 rounded bg-navy-950 border border-slate-800">
                            {node.type}
                          </span>
                          <span className="text-slate-400 text-[10px] truncate max-w-[140px] sm:max-w-[200px]">
                            {node.source}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {node.isTainted ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-red-400" /> TAINTED
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" /> CLEAN
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-navy-950/80">
                            {node.trustLevel}
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-200 text-xs font-sans line-clamp-2 leading-relaxed">
                        {node.content}
                      </p>

                      {node.parentIds.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            Parents: <ArrowRight className="w-3 h-3 text-cyan-400" />
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {node.parentIds.map((pid) => (
                              <span key={pid} className="px-1.5 py-0.5 rounded bg-navy-950 text-cyan-300 text-[10px]">
                                {pid.substring(0, 8)}...
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {filteredNodes.length === 0 && (
                <div className="text-center py-8 text-slate-500 font-mono text-xs">
                  No lineage nodes match the selected filters.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Node Inspector */}
        <div className="card p-5 space-y-4 h-fit sticky top-6 border-slate-800 bg-navy-900/90 text-xs font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-slate-100 uppercase tracking-wider">Node Inspector</h3>
            </div>
            {selectedNode?.isTainted && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Taint Flagged
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Node ID</span>
                <span className="text-cyan-300 font-mono text-xs break-all">{selectedNode.id}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Type</span>
                  <span className="text-slate-200 font-semibold">{selectedNode.type}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Trust Level</span>
                  <span className="text-purple-300 font-semibold">{selectedNode.trustLevel}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Source Identifier</span>
                <span className="text-slate-200 bg-navy-950 px-2 py-1 rounded block mt-0.5 break-all">
                  {selectedNode.source}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Timestamp
                </span>
                <span className="text-slate-300">{new Date(selectedNode.timestamp).toLocaleString()}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-bold mb-1">Content Payload</span>
                <pre className="p-3 bg-navy-950 rounded-lg border border-slate-800 text-[11px] text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  {selectedNode.content}
                </pre>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-bold mb-1">
                  Parent Dependencies ({selectedNode.parentIds.length})
                </span>
                {selectedNode.parentIds.length > 0 ? (
                  <div className="space-y-1">
                    {selectedNode.parentIds.map((pid) => (
                      <div
                        key={pid}
                        onClick={() => {
                          const pNode = nodes.find((n) => n.id === pid)
                          if (pNode) setSelectedNode(pNode)
                        }}
                        className="p-2 bg-navy-950 rounded border border-slate-800 hover:border-cyan-500/40 text-[11px] text-cyan-300 cursor-pointer flex items-center justify-between"
                      >
                        <span className="truncate">{pid}</span>
                        <ArrowRight className="w-3 h-3 shrink-0 ml-1" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 text-[11px]">Root node — no parent dependencies.</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-6">Select a node to inspect its full lineage details.</p>
          )}
        </div>
      </div>
    </div>
  )
}
