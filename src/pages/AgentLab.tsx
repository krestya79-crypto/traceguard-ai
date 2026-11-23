import React, { useState } from 'react'
import {
  Terminal,
  Shield,
  Play,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { AgentRunner, type AgentStepResult, type AgentExecutionState } from '../agent/AgentRunner'
import { getCurrentUser } from '../firebase/auth'
import { EnforcementDecision } from '../types/security'

export const AgentLab: React.FC = () => {
  const [taskPrompt, setTaskPrompt] = useState('Summarize the status report for Project Alpha and list key metrics.')
  const [allowedTools, setAllowedTools] = useState<string[]>(['read_document', 'search_documents', 'read_project_data'])
  const [allowedRecipients, setAllowedRecipients] = useState('manager@company.com')
  const [restrictedCategories] = useState('credentials, pii, financial, passwords')
  const [exportPermitted, setExportPermitted] = useState(false)

  const [isRunning, setIsRunning] = useState(false)
  const [executionState, setExecutionState] = useState<AgentExecutionState | null>(null)
  const [steps, setSteps] = useState<AgentStepResult[]>([])

  const handleToggleTool = (tool: string) => {
    if (allowedTools.includes(tool)) {
      setAllowedTools(allowedTools.filter((t) => t !== tool))
    } else {
      setAllowedTools([...allowedTools, tool])
    }
  }

  const handleRunSession = async () => {
    setIsRunning(true)
    setSteps([])
    setExecutionState(null)

    const runner = new AgentRunner()
    try {
      await runner.initializeSession({
        userId: getCurrentUser()?.uid || 'demo_operator',
        userGoal: taskPrompt,
        allowedTools,
        allowedRecipients: allowedRecipients.split(',').map((r) => r.trim()).filter(Boolean),
        restrictedDataCategories: restrictedCategories.split(',').map((c) => c.trim()).filter(Boolean),
        externalExportPermitted: exportPermitted,
      })

      setExecutionState(runner.getState())

      // Execute scenario or autonomous task based on prompt
      const promptLower = taskPrompt.toLowerCase()
      if (promptLower.includes('vendor') || promptLower.includes('inject')) {
        await runner.runScenarioB((step) => {
          setSteps((prev) => [...prev, step])
          setExecutionState({ ...runner.getState()! })
        })
      } else if (promptLower.includes('email') && promptLower.includes('competitor')) {
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
      console.error('[AgentLab] Session error:', err)
    } finally {
      setIsRunning(false)
      setExecutionState(runner.getState())
    }
  }

  return (
    <div className="space-y-6">
      {/* Session Configuration Card */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100 font-mono uppercase tracking-wider">
              Agent Session & Execution Contract Configuration
            </h2>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
            Security Contract Enforced
          </span>
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
                {['read_document', 'search_documents', 'read_project_data', 'send_email_mock'].map((tool) => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => handleToggleTool(tool)}
                    className={`px-3 py-2 rounded-lg border text-left text-xs transition-colors flex items-center justify-between ${
                      allowedTools.includes(tool)
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                        : 'bg-navy-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{tool}</span>
                    {allowedTools.includes(tool) && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Allowed Email Recipients (comma-separated):</label>
                <input
                  type="text"
                  value={allowedRecipients}
                  onChange={(e) => setAllowedRecipients(e.target.value)}
                  className="w-full bg-navy-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-between bg-navy-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-300 font-medium">External Export Permitted:</span>
                <button
                  type="button"
                  onClick={() => setExportPermitted(!exportPermitted)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    exportPermitted
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {exportPermitted ? 'ENABLED (Risk)' : 'PROHIBITED (Safe)'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-mono">
            Immutable contract will be frozen prior to tool dispatch. Untrusted content cannot alter permissions.
          </p>
          <button
            onClick={handleRunSession}
            disabled={isRunning}
            className="btn-primary flex items-center gap-2 text-xs font-mono"
          >
            {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Running Security Gateway...' : 'Execute Agent Session'}</span>
          </button>
        </div>
      </div>

      {/* Live Execution Stream */}
      {executionState && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <h3 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider">
                Live Gateway Enforcement Stream (Session: {executionState.session.id.substring(0, 8)}...)
              </h3>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
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

          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="p-4 bg-navy-900 rounded-xl border border-slate-800 space-y-2 text-xs font-mono animate-slide-in"
              >
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-bold">STEP {step.stepIndex}</span>
                  {step.securityDecision && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        step.securityDecision.decision === EnforcementDecision.ALLOW
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : step.securityDecision.decision === EnforcementDecision.BLOCK
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                      }`}
                    >
                      Enforcement: {step.securityDecision.decision}
                    </span>
                  )}
                </div>

                <div className="text-slate-300">
                  <span className="text-slate-400 font-semibold">Agent Thought: </span>
                  {step.thought}
                </div>

                {step.actionProposed && (
                  <div className="bg-navy-950 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-400">Proposed Action: </span>
                    <span className="text-purple-300 font-semibold">{step.actionProposed.toolName}</span>
                    <pre className="text-[11px] text-slate-300 mt-1 overflow-x-auto">
                      {JSON.stringify(step.actionProposed.parameters, null, 2)}
                    </pre>
                  </div>
                )}

                {step.securityDecision && (
                  <div
                    className={`p-2.5 rounded border text-[11px] ${
                      step.securityDecision.decision === EnforcementDecision.ALLOW
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-950/20 border-red-500/30 text-red-300'
                    }`}
                  >
                    <span className="font-semibold">Policy Rule Triggered: </span>
                    <span>{step.securityDecision.policyRuleTriggered}</span>
                    <p className="mt-0.5 text-slate-300">{step.securityDecision.reasoning}</p>
                  </div>
                )}

                {step.finalAnswer && (
                  <div className="bg-emerald-950/30 border border-emerald-500/40 p-3 rounded-lg text-emerald-200">
                    <span className="font-bold block mb-1">Agent Final Output:</span>
                    <p>{step.finalAnswer}</p>
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
