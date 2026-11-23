import React, { useState } from 'react'
import {
  Lock,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  Cpu,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { DEFAULT_POLICY_RULES, PolicyEngine } from '../security/PolicyEngine'
import {
  EnforcementDecision,
  InferenceRoute,
  TrustLevel,
  type ProposedToolAction,
  type PolicyEvaluationContext,
  type SecurityDecision,
} from '../types/security'
import { createContract } from '../security/ExecutionContract'
import { AgentRunner } from '../agent/AgentRunner'

export const RuntimeGuard: React.FC = () => {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>('RULE_001')
  const [activeTab, setActiveTab] = useState<'rules' | 'proposals' | 'simulator'>('proposals')

  // Last execution state telemetry from AgentRunner
  const lastState = AgentRunner.getLastExecutionState()
  const recordedDecisions = lastState?.decisions ?? []
  const [selectedDecision, setSelectedDecision] = useState<SecurityDecision | null>(
    recordedDecisions.length > 0 ? recordedDecisions[0] : null
  )

  // Interactive Simulator state
  const [simToolName, setSimToolName] = useState<string>('send_email_mock')
  const [simRecipient, setSimRecipient] = useState<string>('attacker@external-leak.com')
  const [simPayload, setSimPayload] = useState<string>('Summary of financial records')
  const [simTainted, setSimTainted] = useState<boolean>(true)
  const [simAiRiskScore, setSimAiRiskScore] = useState<number>(0.85)
  const [simAiFlag, setSimAiFlag] = useState<string>('PROMPT_INJECTION')
  const [simExportPermitted, setSimExportPermitted] = useState<boolean>(false)
  const [simAllowedTools, setSimAllowedTools] = useState<string>('read_document,search_documents')
  const [simResult, setSimResult] = useState<SecurityDecision | null>(null)

  const handleSimulate = () => {
    const policyEngine = new PolicyEngine()
    const allowedToolsList = simAllowedTools
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const contract = createContract({
      userId: 'sim_user',
      sessionId: 'session_sim',
      userGoal: 'Simulation test session',
      allowedTools: allowedToolsList,
      allowedRecipients: ['security-team@internal.org', 'audit@traceguard.ai'],
      externalExportPermitted: simExportPermitted,
      restrictedDataCategories: ['CREDENTIALS', 'CONFIDENTIAL', 'SECRET', 'API_KEY', 'TOKEN', 'FINANCIAL'],
    })

    const proposedAction: ProposedToolAction = {
      id: uuidv4(),
      toolName: simToolName,
      parameters: {
        recipient: simRecipient,
        content: simPayload,
        payload: simPayload,
      },
      initiatedByNodeId: 'node_sim_01',
      sessionId: 'session_sim',
      timestamp: Date.now(),
    }

    const ctx: PolicyEvaluationContext = {
      contract,
      proposedAction,
      provenanceChain: [
        {
          id: 'node_sim_01',
          type: 'EXTERNAL_DOCUMENT',
          trustLevel: simTainted ? TrustLevel.UNTRUSTED_EXTERNAL : TrustLevel.TRUSTED_USER,
          content: simPayload,
          source: 'simulated_input',
          parentIds: [],
          timestamp: Date.now(),
        },
      ],
      taintLabels: [
        {
          nodeId: 'node_sim_01',
          tainted: simTainted,
          taintReason: simTainted ? 'Simulated untrusted source / prompt injection' : undefined,
          propagatedFrom: [],
        },
      ],
      aiRiskSignal: {
        riskScore: simAiRiskScore,
        flags: simAiFlag ? [simAiFlag] : [],
        reasoning: 'Advisory risk signal from AI Logic heuristic / model evaluator',
        inferenceRoute: InferenceRoute.FALLBACK,
        modelUsed: 'policy_sim_heuristic',
        analysisType: 'CLOUD_ANALYSIS',
      },
    }

    const decision = policyEngine.evaluate(ctx)
    setSimResult(decision)
  }

  const selectedRule = DEFAULT_POLICY_RULES.find((r) => r.id === selectedRuleId)

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card p-5 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100 font-mono uppercase tracking-wider">
              Runtime Guard & Deterministic Policy Engine
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              DETERMINISTIC ENFORCEMENT ACTIVE
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              FAIL-SAFE DEFAULT-DENY
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          The runtime security boundary evaluates every proposed tool call against deterministic rules in priority order. AI risk signals serve strictly as advisory inputs — an LLM output alone never grants execution permissions.
        </p>

        {/* View Switcher Tabs */}
        <div className="flex gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('proposals')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors ${
              activeTab === 'proposals'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            Intercepted Proposals ({recordedDecisions.length})
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors ${
              activeTab === 'simulator'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            Policy Simulator
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors ${
              activeTab === 'rules'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            Rule Priority Matrix ({DEFAULT_POLICY_RULES.length} Rules)
          </button>
        </div>
      </div>

      {/* TAB 1: INTERCEPTED PROPOSALS */}
      {activeTab === 'proposals' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                Recent Intercepted Tool Proposals
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                {recordedDecisions.length} recorded in active session
              </span>
            </div>

            {recordedDecisions.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-slate-400 space-y-2">
                <Info className="w-8 h-8 text-slate-400 mx-auto" />
                <p>No tool proposals intercepted yet.</p>
                <p className="text-[11px] text-slate-400">
                  Run a scenario in the <strong>Agent Lab</strong> or <strong>Attack Simulator</strong> to observe live runtime interception.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recordedDecisions.map((dec) => {
                  const isSelected = selectedDecision?.id === dec.id
                  const isBlocked = dec.decision === EnforcementDecision.BLOCK
                  const isAllow = dec.decision === EnforcementDecision.ALLOW

                  return (
                    <div
                      key={dec.id}
                      onClick={() => setSelectedDecision(dec)}
                      className={`p-3.5 rounded-lg border text-xs font-mono cursor-pointer transition-all ${
                        isSelected
                          ? 'border-cyan-500/60 bg-navy-900 shadow-md'
                          : 'border-slate-800 bg-navy-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          {isBlocked ? (
                            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                          ) : isAllow ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                          )}
                          <span className="font-bold text-slate-100">{dec.proposedAction.toolName}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(dec.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-cyan-300 font-semibold">
                            {dec.policyRuleTriggered}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              isAllow
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isBlocked
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            }`}
                          >
                            {dec.decision}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-1">{dec.reasoning}</p>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/60">
                        <span className="truncate max-w-xs">
                          Target / Params:{' '}
                          <span className="text-slate-300">
                            {String(dec.proposedAction.parameters.recipient || dec.proposedAction.parameters.documentId || 'Standard execution')}
                          </span>
                        </span>
                        {dec.aiRiskSignal && (
                          <span className="text-amber-400 font-semibold">
                            AI Risk: {Math.round(dec.aiRiskSignal.riskScore * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Decision Inspector Panel */}
          <div className="card p-5 space-y-4 h-fit sticky top-6">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider">
                Proposal & Provenance Inspector
              </h3>
            </div>

            {selectedDecision ? (
              <div className="space-y-3.5 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">Proposed Action:</span>
                  <span className="text-cyan-300 font-bold text-sm">
                    {selectedDecision.proposedAction.toolName}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Final Deterministic Decision:</span>
                  <span
                    className={`inline-block mt-0.5 px-2.5 py-1 rounded text-xs font-bold uppercase ${
                      selectedDecision.decision === EnforcementDecision.ALLOW
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : selectedDecision.decision === EnforcementDecision.BLOCK
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}
                  >
                    {selectedDecision.decision}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Triggered Policy Rule:</span>
                  <span className="text-purple-300 font-semibold">
                    {selectedDecision.policyRuleTriggered}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Deterministic Reasoning:</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed bg-navy-950 p-2.5 rounded border border-slate-800 mt-1">
                    {selectedDecision.reasoning}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Action Parameters:</span>
                  <pre className="text-[10px] text-slate-300 bg-navy-950 p-2.5 rounded border border-slate-800 overflow-x-auto mt-1 max-h-36">
                    {JSON.stringify(selectedDecision.proposedAction.parameters, null, 2)}
                  </pre>
                </div>

                {selectedDecision.aiRiskSignal && (
                  <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                        <Cpu className="w-3 h-3" />
                        AI Advisory Risk Signal:
                      </span>
                      <span className="text-xs font-bold text-amber-300">
                        {Math.round(selectedDecision.aiRiskSignal.riskScore * 100)}%
                      </span>
                    </div>
                    {selectedDecision.aiRiskSignal.flags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedDecision.aiRiskSignal.flags.map((f, i) => (
                          <span
                            key={i}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 pt-1">
                      {selectedDecision.aiRiskSignal.reasoning}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                  <span>Initiated by node: </span>
                  <span className="text-slate-300 font-mono">
                    {selectedDecision.proposedAction.initiatedByNodeId || 'root_agent_task'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs font-mono">
                Select an intercepted proposal to view runtime evaluation details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE POLICY SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Play className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                Simulate Tool Proposal Evaluation
              </h3>
            </div>

            <p className="text-xs text-slate-400">
              Formulate a custom proposed action, adjust taint status, data classification, and AI advisory signals to test deterministic policy decisions in real time.
            </p>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Tool Name:</label>
                <select
                  value={simToolName}
                  onChange={(e) => setSimToolName(e.target.value)}
                  className="w-full bg-navy-950 border border-slate-700 rounded p-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="send_email_mock">send_email_mock (External Email)</option>
                  <option value="read_document">read_document (Internal Read)</option>
                  <option value="search_documents">search_documents (Search Docs)</option>
                  <option value="http_request">http_request (HTTP Exfiltration)</option>
                  <option value="export_data">export_data (Export Dataset)</option>
                  <option value="system_admin_override">system_admin_override (Unauthorized Admin Tool)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Contract Allowed Tools:</label>
                <input
                  type="text"
                  value={simAllowedTools}
                  onChange={(e) => setSimAllowedTools(e.target.value)}
                  placeholder="e.g. read_document,search_documents"
                  className="w-full bg-navy-950 border border-slate-700 rounded p-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">Comma-separated list of pre-approved tools</span>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Target / Recipient:</label>
                <input
                  type="text"
                  value={simRecipient}
                  onChange={(e) => setSimRecipient(e.target.value)}
                  placeholder="e.g. attacker@external-leak.com"
                  className="w-full bg-navy-950 border border-slate-700 rounded p-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Payload / Content:</label>
                <textarea
                  value={simPayload}
                  onChange={(e) => setSimPayload(e.target.value)}
                  rows={2}
                  className="w-full bg-navy-950 border border-slate-700 rounded p-2 text-slate-200 focus:border-cyan-500 focus:outline-none text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simTainted}
                    onChange={(e) => setSimTainted(e.target.checked)}
                    className="accent-red-500"
                  />
                  <span className="text-[11px] text-slate-300">Origin Node Tainted</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simExportPermitted}
                    onChange={(e) => setSimExportPermitted(e.target.checked)}
                    className="accent-cyan-500"
                  />
                  <span className="text-[11px] text-slate-300">Contract Allows Export</span>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300">AI Advisory Risk Score:</span>
                  <span className="text-amber-400 font-bold">{Math.round(simAiRiskScore * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={simAiRiskScore}
                  onChange={(e) => setSimAiRiskScore(parseFloat(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 block mb-1">AI Flag Signal:</label>
                <select
                  value={simAiFlag}
                  onChange={(e) => setSimAiFlag(e.target.value)}
                  className="w-full bg-navy-950 border border-slate-700 rounded p-2 text-slate-200 focus:border-cyan-500 focus:outline-none text-[11px]"
                >
                  <option value="">None (Benign)</option>
                  <option value="PROMPT_INJECTION">PROMPT_INJECTION</option>
                  <option value="JAILBREAK_ATTEMPT">JAILBREAK_ATTEMPT</option>
                  <option value="EXFILTRATION_PATTERN">EXFILTRATION_PATTERN</option>
                  <option value="ROLE_OVERRIDE">ROLE_OVERRIDE</option>
                </select>
              </div>

              <button
                onClick={handleSimulate}
                className="w-full btn-primary flex items-center justify-center gap-2 text-xs font-mono py-2.5 mt-2"
              >
                <Play className="w-4 h-4" />
                <span>Evaluate Proposal Deterministically</span>
              </button>
            </div>
          </div>

          {/* Simulation Output Inspector */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                Evaluation Verdict & Rule Trace
              </h3>
            </div>

            {simResult ? (
              <div className="space-y-4 text-xs font-mono">
                <div className="p-4 rounded-lg border bg-navy-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Enforcement Decision:</span>
                    <span
                      className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                        simResult.decision === EnforcementDecision.ALLOW
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : simResult.decision === EnforcementDecision.BLOCK
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                      }`}
                    >
                      {simResult.decision}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Matching Rule ID:</span>
                    <span className="text-cyan-300 font-bold">{simResult.policyRuleTriggered}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Reasoning & Rule Description:</span>
                  <p className="text-slate-200 text-xs bg-navy-950 p-3 rounded border border-slate-800 leading-relaxed">
                    {simResult.reasoning}
                  </p>
                </div>

                <div className="space-y-1.5 p-3 rounded bg-navy-950/60 border border-slate-800/80 text-[11px]">
                  <div className="font-semibold text-slate-300">Policy Evaluation Context:</div>
                  <div className="text-slate-400">
                    • Tool Requested: <span className="text-slate-200">{simResult.proposedAction.toolName}</span>
                  </div>
                  <div className="text-slate-400">
                    • Origin Taint Status:{' '}
                    <span className={simTainted ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                      {simTainted ? 'TAINTED (Untrusted input lineage)' : 'CLEAN (Trusted user instruction)'}
                    </span>
                  </div>
                  <div className="text-slate-400">
                    • Advisory AI Signal:{' '}
                    <span className="text-amber-300 font-bold">
                      {Math.round((simResult.aiRiskSignal?.riskScore || 0) * 100)}%
                    </span>{' '}
                    ({simResult.aiRiskSignal?.flags.join(', ') || 'CLEAN'})
                  </div>
                </div>

                <div className="p-3 rounded bg-cyan-950/30 border border-cyan-800/50 text-[11px] text-slate-300">
                  <div className="font-bold text-cyan-300 mb-0.5">Architectural Guarantee:</div>
                  Notice that even if AI score was 0.0, a tainted origin triggers <strong>RULE_004 (BLOCK)</strong>. Even if AI score was 1.0, an allowed read tool with no flags triggers <strong>RULE_008 (ALLOW)</strong> or <strong>RULE_006 (APPROVAL_REQUIRED)</strong>. Determinism is absolute.
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 text-xs font-mono space-y-2">
                <ChevronRight className="w-8 h-8 text-cyan-500/40 mx-auto" />
                <p>Configure parameters on the left and click "Evaluate Proposal".</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RULE PRIORITY MATRIX */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider border-b border-slate-800 pb-2">
              Active Security Rules (Evaluated Highest Priority First)
            </h3>

            <div className="space-y-2">
              {DEFAULT_POLICY_RULES.map((rule) => {
                const isSelected = selectedRuleId === rule.id
                return (
                  <div
                    key={rule.id}
                    onClick={() => setSelectedRuleId(rule.id)}
                    className={`p-3.5 rounded-lg border text-xs font-mono cursor-pointer transition-all ${
                      isSelected
                        ? 'border-cyan-500/50 bg-navy-900 shadow-sm'
                        : 'border-slate-800 bg-navy-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-cyan-300">{rule.id}</span>
                        <span className="text-slate-200 font-medium">{rule.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">Priority: {rule.priority}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            rule.decision === EnforcementDecision.ALLOW
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : rule.decision === EnforcementDecision.BLOCK
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}
                        >
                          {rule.decision}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{rule.description}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected Rule Inspector */}
          <div className="card p-5 space-y-4 h-fit sticky top-6">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider">
                Rule Specification
              </h3>
            </div>

            {selectedRule ? (
              <div className="space-y-3 text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block">Rule Identifier:</span>
                  <span className="text-cyan-300 font-bold text-sm">{selectedRule.id}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] block">Rule Name:</span>
                  <span className="text-slate-100 font-semibold">{selectedRule.name}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] block">Enforcement Decision:</span>
                  <span
                    className={`inline-block mt-0.5 px-2.5 py-1 rounded text-xs font-bold uppercase ${
                      selectedRule.decision === EnforcementDecision.ALLOW
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : selectedRule.decision === EnforcementDecision.BLOCK
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}
                  >
                    {selectedRule.decision}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] block">Evaluation Priority:</span>
                  <span className="text-slate-200">{selectedRule.priority} (100 = Maximum)</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] block">Enforcement Logic:</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed bg-navy-950 p-2.5 rounded border border-slate-800 mt-1">
                    {selectedRule.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Architecture Guarantee:</span>
                  <p className="text-[10px] text-slate-400">
                    Rules execute synchronously inside RuntimeEnforcement. AI models provide risk signals (0.0 to 1.0) but never issue permissions directly.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs font-mono">
                Select a rule to view specification.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}