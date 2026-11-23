import React, { useState } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  ChevronRight,
  Info,
} from 'lucide-react'
import { AttackComparisonEngine, type AttackComparisonResult } from '../agent/AttackComparisonEngine'

export const AttackComparisonLab: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<'SCENARIO_B' | 'SCENARIO_C'>('SCENARIO_B')
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [comparisonResult, setComparisonResult] = useState<AttackComparisonResult | null>(null)

  const handleRunComparison = async () => {
    setIsRunning(true)
    const engine = new AttackComparisonEngine()
    try {
      let res: AttackComparisonResult
      if (selectedScenario === 'SCENARIO_B') {
        res = await engine.compareScenarioB()
      } else {
        res = await engine.compareScenarioC()
      }
      setComparisonResult(res)
    } catch (err) {
      console.error('[AttackComparisonLab] Execution error:', err)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-navy-900 via-navy-950 to-slate-900 border border-slate-800 rounded-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                Evaluation Lab
              </span>
              <span className="text-xs text-slate-400 font-mono">Differential Security Analysis</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              Unprotected Agent vs. TRACEGUARD AI Protected Agent
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl mt-1">
              Demonstrates the vulnerability of conventional autonomous agents when processing adversarial payloads versus TRACEGUARD AI's deterministic runtime enforcement.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedScenario}
              onChange={(e) => {
                setSelectedScenario(e.target.value as 'SCENARIO_B' | 'SCENARIO_C')
                setComparisonResult(null)
              }}
              disabled={isRunning}
              className="bg-navy-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="SCENARIO_B">Scenario B: Indirect Prompt Injection</option>
              <option value="SCENARIO_C">Scenario C: Sensitive Data Exfiltration</option>
            </select>

            <button
              onClick={handleRunComparison}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold font-mono shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isRunning ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  Executing Comparison...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Execute Comparison
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unprotected Agent Column */}
        <div className="bg-navy-950/80 border border-red-900/40 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-red-900/30 mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-semibold text-red-200">
                  Standard Unprotected Agent
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                NO RUNTIME GATEWAY
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              The agent relies solely on system prompt instructions and internal LLM reasoning. When untrusted documents contain prompt injections or instruction overrides, it blindly follows them.
            </p>

            {comparisonResult ? (
              <div className="space-y-4">
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-400 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    EXPLOITATION SUCCESSFUL (FAILURE)
                  </div>
                  <p className="text-xs text-red-200/90 leading-relaxed font-mono">
                    {comparisonResult.unprotected.outcomeSummary}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-slate-400">Tool Executed by Agent:</div>
                  <div className="p-2.5 bg-navy-900 border border-slate-800 rounded text-xs font-mono text-amber-300 break-all">
                    {comparisonResult.unprotected.toolExecuted}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono text-slate-400">Security Violations Incurred:</div>
                  <ul className="space-y-1">
                    {comparisonResult.unprotected.securityViolations.map((v, i) => (
                      <li key={i} className="text-xs font-mono text-red-400/90 flex items-start gap-1.5">
                        <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-red-500" />
                        {v}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs font-mono">
                Click &quot;Execute Comparison&quot; above to view live side-by-side execution analysis.
              </div>
            )}
          </div>

          <div className="mt-6 pt-3 border-t border-slate-800/60 text-[11px] text-slate-500 font-mono">
            Vulnerable to OWASP LLM01, LLM02, and LLM06
          </div>
        </div>

        {/* TRACEGUARD Protected Agent Column */}
        <div className="bg-navy-950/80 border border-emerald-900/40 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-emerald-900/30 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-emerald-200">
                  TRACEGUARD AI Protected Agent
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                ACTIVE GATEWAY ENFORCING
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              The agent is bound by an immutable, deep-frozen ExecutionContract. Every proposed tool call passes through RuntimeEnforcement, evaluating provenance DAG lineage, taint flags, and deterministic priority rules.
            </p>

            {comparisonResult ? (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    ATTACK INTERCEPTED & ACTION BLOCKED
                  </div>
                  <p className="text-xs text-emerald-200/90 leading-relaxed font-mono">
                    {comparisonResult.protected.outcomeSummary}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 bg-navy-900 border border-slate-800 rounded">
                    <div className="text-[10px] text-slate-400 font-mono">Enforcement Decision</div>
                    <div className="text-sm font-bold text-red-400 font-mono">BLOCK (DENIED)</div>
                  </div>
                  <div className="p-2.5 bg-navy-900 border border-slate-800 rounded">
                    <div className="text-[10px] text-slate-400 font-mono">Deterministic Policy</div>
                    <div className="text-xs font-bold text-cyan-400 font-mono truncate" title={comparisonResult.protected.policyTriggered}>
                      {comparisonResult.protected.policyTriggered}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono text-slate-400">Security Invariants Preserved:</div>
                  <ul className="space-y-1">
                    <li className="text-xs font-mono text-emerald-300 flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3 text-emerald-400" />
                      Execution Contract maintained zero mutations (deep-frozen)
                    </li>
                    <li className="text-xs font-mono text-emerald-300 flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3 text-emerald-400" />
                      Taint propagation identified tainted document source
                    </li>
                    <li className="text-xs font-mono text-emerald-300 flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3 text-emerald-400" />
                      Zero confidential bytes exited runtime gateway boundary
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs font-mono">
                Click &quot;Execute Comparison&quot; above to view live side-by-side execution analysis.
              </div>
            )}
          </div>

          <div className="mt-6 pt-3 border-t border-slate-800/60 text-[11px] text-slate-500 font-mono">
            Zero-Trust Architectural Protection (Deterministic Priority Decision)
          </div>
        </div>
      </div>

      {/* Attack Payload Inspector */}
      {comparisonResult && (
        <div className="p-4 bg-navy-950 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 mb-2 text-xs font-mono text-slate-300">
            <Info className="w-4 h-4 text-cyan-400" />
            <span>Adversarial Payload Passed to Model:</span>
          </div>
          <div className="p-3 bg-navy-900 border border-slate-800 rounded font-mono text-xs text-red-300 overflow-x-auto whitespace-pre-wrap">
            {comparisonResult.payloadDescription}
          </div>
        </div>
      )}
    </div>
  )
}
