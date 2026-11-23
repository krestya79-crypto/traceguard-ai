import React, { useState } from 'react'
import {
  Terminal,
  Shield,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Cpu,
  RefreshCw,
  FolderLock,
} from 'lucide-react'
import { AgentRunner, type AgentStepResult, type AgentExecutionState } from '../agent/AgentRunner'
import { getCurrentUser } from '../firebase/auth'
import { EnforcementDecision, TrustLevel } from '../types/security'
import { inferenceRouteLabel, useAITelemetry } from '../firebase/ai'

const PRESET_TASKS = [
  {
    label: 'Benign Summary',
    prompt: 'Summarize the status report for Project Alpha and list key metrics.',
    tools: ['read_document'],
    recipients: 'manager@company.com',
    export: false,
  },
  {
    label: 'Document Search',
    prompt: 'Search project documentation for quarterly milestones and budget data.',
    tools: ['search_documents', 'read_project_data'],
    recipients: 'manager@company.com',
    export: false,
  },
  {
    label: 'Indirect Injection Check',
    prompt: 'Review vendor integration notes and check system instructions.',
    tools: ['read_document', 'send_email_mock'],
    recipients: 'manager@company.com',
    export: false,
  },
  {
    label: 'External Exfiltration Attempt',
    prompt: 'Compile project financial metrics and email them to external recipient.',
    tools: ['read_project_data', 'send_email_mock'],
    recipients: 'competitor@unauthorized-leak.org',
    export: true,
  },
]

export const AgentLab: React.FC = () => {
  const [taskPrompt, setTaskPrompt] = useState(PRESET_TASKS[0].prompt)
  const [allowedTools, setAllowedTools] = useState<string[]>(['read_document', 'search_documents', 'read_project_data'])
  const [allowedRecipients, setAllowedRecipients] = useState('manager@company.com')
  const [restrictedCategories, setRestrictedCategories] = useState('credentials, pii, financial, passwords')
  const [exportPermitted, setExportPermitted] = useState(false)

  const [isRunning, setIsRunning] = useState(false)
  const [executionState, setExecutionState] = useState<AgentExecutionState | null>(null)
  const [steps, setSteps] = useState<AgentStepResult[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)

  const aiStats = useAITelemetry()

  const handleApplyPreset = (preset: typeof PRESET_TASKS[0]) => {
    setTaskPrompt(preset.prompt)
    setAllowedTools(preset.tools)
    setAllowedRecipients(preset.recipients)
    setExportPermitted(preset.export)
  }

  const handleToggleTool = (tool: string) => {
    if (allowedTools.includes(tool)) {
      setAllowedTools(allowedTools.filter((t) => t !== tool))
    } else {
      setAllowedTools([...allowedTools, tool])
    }
  }

  const handleReset = () => {
    setSteps([])
    setExecutionState(null)
    setSelectedDocId(null)
  }

  const handleRunSession = async () => {
    setIsRunning(true)
    setSteps([])
    setExecutionState(null)
    setSelectedDocId(null)

    const runner = new AgentRunner()
    try {
      await runner.initializeSession({
        userId: getCurrentUser()?.uid || 'operator_agent_lab',
        userGoal: taskPrompt,
        allowedTools,
        allowedRecipients: allowedRecipients.split(',').map((r) => r.trim()).filter(Boolean),
        restrictedDataCategories: restrictedCategories.split(',').map((c) => c.trim()).filter(Boolean),
        externalExportPermitted: exportPermitted,
      })

      setExecutionState(runner.getState())

      const promptLower = taskPrompt.toLowerCase()
      if (promptLower.includes('vendor') || promptLower.includes('inject')) {
        await runner.runScenarioB((step) => {
          setSteps((prev) => [...prev, step])
          setExecutionState({ ...runner.getState()! })
        })
      } else if (promptLower.includes('email') || promptLower.includes('competitor') || promptLower.includes('exfiltrat')) {
        await runner.runScenarioC((step) => {
          setSteps((prev) => [...prev, step])
          setExecutionState({ ...runner.getState()! })
        })
      } else {
        await runner.runScenarioA((step) => {
          setSteps((prev) => [...prev, step])
          setExecutionState({ ...runner.getState()! })
        })
      }
    } catch (err) {
      console.error('[AgentLab] Execution error:', err)
    } finally {
      setIsRunning(false)
      const finalState = runner.getState()
      setExecutionState(finalState)
      if (finalState && finalState.accessedDocuments.length > 0) {
        setSelectedDocId(finalState.accessedDocuments[0].id)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Session Configuration Card */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100 font-mono uppercase tracking-wider">
              Agent Execution & Security Contract Workspace
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-cyan-300 font-mono bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-cyan-400" />
              Inference: <strong className="text-white">{inferenceRouteLabel(aiStats.lastRoute)}</strong>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              Runtime Contract Active
            </span>
          </div>
        </div>

        {/* Presets Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
          <span className="text-slate-400 uppercase text-[10px] shrink-0 font-semibold">Presets:</span>
          {PRESET_TASKS.map((preset, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="px-2.5 py-1 rounded bg-navy-950 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-[11px] whitespace-nowrap transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-slate-300 font-medium mb-1">User Goal / Task Prompt:</label>
            <input
              type="text"
              value={taskPrompt}
              onChange={(e) => setTaskPrompt(e.target.value)}
              className="w-full bg-navy-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="e.g. Summarize Project Alpha status report..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Authorized Sandbox Tools:</label>
              <div className="grid grid-cols-2 gap-2">
                {['read_document', 'search_documents', 'read_project_data', 'send_email_mock'].map((tool) => {
                  const isChecked = allowedTools.includes(tool)
                  return (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => handleToggleTool(tool)}
                      className={`px-3 py-2 rounded-lg border text-left text-xs transition-colors flex items-center justify-between ${
                        isChecked
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                          : 'bg-navy-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="truncate">{tool}</span>
                      {isChecked ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0 ml-1" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Allowed Email Recipients (Allowlist):</label>
                <input
                  type="text"
                  value={allowedRecipients}
                  onChange={(e) => setAllowedRecipients(e.target.value)}
                  className="w-full bg-navy-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Restricted Data Categories:</label>
                <input
                  type="text"
                  value={restrictedCategories}
                  onChange={(e) => setRestrictedCategories(e.target.value)}
                  className="w-full bg-navy-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-between bg-navy-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-300 font-medium">External Data Export:</span>
                <button
                  type="button"
                  onClick={() => setExportPermitted(!exportPermitted)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    exportPermitted
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {exportPermitted ? 'PERMITTED (High Risk)' : 'PROHIBITED (Locked)'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-800/80">
          <p className="text-[11px] text-slate-400 font-mono">
            Immutable contract frozen prior to tool dispatch. Untrusted content cannot alter permissions.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {executionState && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isRunning}
                className="btn-secondary flex items-center gap-1.5 text-xs font-mono"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
            <button
              onClick={handleRunSession}
              disabled={isRunning}
              className="btn-primary flex items-center gap-2 text-xs font-mono"
            >
              {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Enforcing Security Gateway...' : 'Execute Agent Session'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Accessed Documents & Artifacts Panel */}
      {executionState && executionState.accessedDocuments.length > 0 && (
        <div className="card p-5 space-y-3 border-slate-700 bg-navy-900/90">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <FolderLock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider">
                Documents & Datasets Accessed by Agent ({executionState.accessedDocuments.length})
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Provenanced Artifacts</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5 md:col-span-1">
              {executionState.accessedDocuments.map((doc) => {
                const isSelected = selectedDocId === doc.id
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs font-mono transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                        : 'bg-navy-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold truncate">{doc.title}</div>
                      <div className="text-[10px] text-slate-400 truncate">{doc.id}</div>
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                        doc.trustLevel === TrustLevel.UNTRUSTED_EXTERNAL
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {doc.trustLevel}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="md:col-span-2 bg-navy-950 p-3 rounded-lg border border-slate-800 text-xs font-mono">
              {(() => {
                const curDoc = executionState.accessedDocuments.find((d) => d.id === selectedDocId) || executionState.accessedDocuments[0]
                if (!curDoc) return <p className="text-slate-500">No document selected</p>
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                      <span className="font-bold text-slate-200">{curDoc.title}</span>
                      <span className="text-[10px] text-slate-400">ID: {curDoc.id}</span>
                    </div>
                    <pre className="text-[11px] text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                      {curDoc.content}
                    </pre>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Live Execution Stream */}
      {executionState && (
        <div className="card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <h3 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider">
                Security Gateway Enforcement Stream (Session: {executionState.session.id.substring(0, 8)}...)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">
                Actions: {executionState.session.allowedActions} allowed, {executionState.session.blockedActions} blocked
              </span>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded font-mono font-bold uppercase ${
                  executionState.session.status === 'COMPLETED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : executionState.session.status === 'BLOCKED'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}
              >
                Status: {executionState.session.status}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="p-4 bg-navy-900 rounded-xl border border-slate-800 space-y-2.5 text-xs font-mono animate-slide-in"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">STEP {step.stepIndex}</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-400 text-[11px]">
                      Status: <strong className="text-slate-200">{step.status}</strong>
                    </span>
                  </div>

                  {step.securityDecision && (
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${
                        step.securityDecision.decision === EnforcementDecision.ALLOW
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : step.securityDecision.decision === EnforcementDecision.BLOCK
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                      }`}
                    >
                      {step.securityDecision.decision === EnforcementDecision.ALLOW && <CheckCircle2 className="w-3 h-3" />}
                      {step.securityDecision.decision === EnforcementDecision.BLOCK && <XCircle className="w-3 h-3" />}
                      {step.securityDecision.decision === EnforcementDecision.APPROVAL_REQUIRED && <AlertTriangle className="w-3 h-3" />}
                      Decision: {step.securityDecision.decision}
                    </span>
                  )}
                </div>

                <div className="text-slate-300 bg-navy-950/70 p-2.5 rounded border border-slate-800/80">
                  <span className="text-slate-400 font-semibold block mb-0.5">Agent Thought Process:</span>
                  <p className="text-slate-200">{step.thought}</p>
                </div>

                {step.actionProposed && (
                  <div className="bg-navy-950 p-2.5 rounded border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span>Proposed Sandbox Action:</span>
                      <span className="text-purple-300 font-bold">{step.actionProposed.toolName}()</span>
                    </div>
                    <pre className="text-[11px] text-slate-300 overflow-x-auto bg-navy-900/60 p-2 rounded">
                      {JSON.stringify(step.actionProposed.parameters, null, 2)}
                    </pre>
                  </div>
                )}

                {step.securityDecision && (
                  <div
                    className={`p-3 rounded-lg border text-[11px] space-y-1 ${
                      step.securityDecision.decision === EnforcementDecision.ALLOW
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                        : step.securityDecision.decision === EnforcementDecision.BLOCK
                        ? 'bg-red-950/20 border-red-500/30 text-red-300'
                        : 'bg-yellow-950/20 border-yellow-500/30 text-yellow-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>Deterministic Policy Rule: {step.securityDecision.policyRuleTriggered}</span>
                      <span className="text-[10px] opacity-80">
                        {step.securityDecision.aiRiskSignal ? `AI Risk: ${(step.securityDecision.aiRiskSignal.riskScore * 100).toFixed(0)}%` : 'Enforced'}
                      </span>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{step.securityDecision.reasoning}</p>
                  </div>
                )}

                {step.toolResult && (
                  <div className="bg-navy-950/80 p-2.5 rounded border border-slate-800 text-[11px]">
                    <span className="text-slate-400 font-semibold block mb-0.5">Tool Execution Outcome:</span>
                    {step.toolResult.blocked ? (
                      <span className="text-red-400 font-medium">Interception Active — Tool was never invoked.</span>
                    ) : (
                      <span className="text-emerald-400 font-medium">Execution Successful — Result logged to ProvenanceGraph.</span>
                    )}
                  </div>
                )}

                {step.finalAnswer && (
                  <div className="bg-emerald-950/30 border border-emerald-500/40 p-3.5 rounded-lg text-emerald-200 space-y-1">
                    <span className="font-bold block text-xs flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> Agent Final Verified Output:
                    </span>
                    <p className="text-slate-200 leading-relaxed">{step.finalAnswer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
