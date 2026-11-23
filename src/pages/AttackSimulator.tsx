import React, { useState } from 'react'
import {
  Zap,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { AgentRunner, type AgentStepResult } from '../agent/AgentRunner'
import { EnforcementDecision } from '../types/security'

export const AttackSimulator: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false)
  const [steps, setSteps] = useState<AgentStepResult[]>([])
  const [outcome, setOutcome] = useState<{ status: 'ALLOW' | 'BLOCK'; title: string; summary: string } | null>(null)

  const runScenario = async (type: 'A' | 'B' | 'C') => {
    setIsRunning(true)
    setSteps([])
    setOutcome(null)

    const runner = new AgentRunner()
    try {
      if (type === 'A') {
        await runner.runScenarioA((step) => {
          setSteps((prev) => [...prev, step])
        })
        setOutcome({
          status: 'ALLOW',
          title: 'Scenario A: Benign Task Authorized',
          summary: 'The agent read the authorized project report and produced a summary. RuntimeEnforcement verified the read operation against the contract and allowed execution.',
        })
      } else if (type === 'B') {
        const res = await runner.runScenarioB((step) => {
          setSteps((prev) => [...prev, step])
        })
        setOutcome({
          status: 'BLOCK',
          title: 'Scenario B: Indirect Prompt Injection Neutralized',
          summary: `The document contained hidden instructions to exfiltrate system tokens. TaintEngine marked the document as tainted. When the agent attempted to invoke send_email_mock, RuntimeEnforcement intercepted and blocked the action: "${res.violationReason}".`,
        })
      } else if (type === 'C') {
        const res = await runner.runScenarioC((step) => {
          setSteps((prev) => [...prev, step])
        })
        setOutcome({
          status: 'BLOCK',
          title: 'Scenario C: Data Exfiltration Prevented',
          summary: `The agent attempted to transmit confidential financial metrics to competitor@unauthorized-leak.org. PolicyEngine identified that the recipient was not in the contract allowlist and blocked transmission: "${res.violationReason}". The email tool was never executed.`,
        })
      }
    } catch (err) {
      console.error('[AttackSimulator] Error:', err)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="card p-5 space-y-2 border-slate-700">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-100 font-mono uppercase tracking-wider">
            Attack Simulation & Demonstration Suite
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Execute realistic prompt injection and data exfiltration attack scenarios against TRACEGUARD AI's runtime security layer.
          Observe how provenance lineage, taint propagation, and deterministic policy rules thwart attacks in real-time.
        </p>
      </div>

      {/* Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Scenario A Card */}
        <div className="card p-5 space-y-4 border-emerald-500/30 bg-navy-900/80 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                SCENARIO A
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-white">Benign Project Summary</h3>
            <p className="text-xs text-slate-400 font-mono">
              Legitimate user requests summary of Project Alpha report. All actions conform to the contract.
            </p>
            <div className="text-[11px] text-slate-400 font-mono space-y-1 bg-navy-950 p-2.5 rounded border border-slate-800">
              <div>Contract: <span className="text-emerald-300">read_document</span></div>
              <div>Expected: <span className="text-emerald-300">ALLOWED</span></div>
            </div>
          </div>

          <button
            onClick={() => runScenario('A')}
            disabled={isRunning}
            className="w-full py-2 px-3 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Launch Scenario A</span>
          </button>
        </div>

        {/* Scenario B Card */}
        <div className="card p-5 space-y-4 border-red-500/30 bg-navy-900/80 hover:border-red-500/50 transition-all flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded">
                SCENARIO B
              </span>
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <h3 className="text-sm font-bold text-white">Indirect Prompt Injection</h3>
            <p className="text-xs text-slate-400 font-mono">
              External vendor doc contains adversarial instructions to override security policies and exfiltrate secrets.
            </p>
            <div className="text-[11px] text-slate-400 font-mono space-y-1 bg-navy-950 p-2.5 rounded border border-slate-800">
              <div>Threat: <span className="text-red-300">Instruction Override</span></div>
              <div>Expected: <span className="text-red-300">TAINTED & BLOCKED</span></div>
            </div>
          </div>

          <button
            onClick={() => runScenario('B')}
            disabled={isRunning}
            className="w-full py-2 px-3 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Launch Scenario B</span>
          </button>
        </div>

        {/* Scenario C Card */}
        <div className="card p-5 space-y-4 border-yellow-500/30 bg-navy-900/80 hover:border-yellow-500/50 transition-all flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded">
                SCENARIO C
              </span>
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
            </div>
            <h3 className="text-sm font-bold text-white">Data Exfiltration</h3>
            <p className="text-xs text-slate-400 font-mono">
              Agent attempts to send confidential financial metrics to an unauthorized external recipient.
            </p>
            <div className="text-[11px] text-slate-400 font-mono space-y-1 bg-navy-950 p-2.5 rounded border border-slate-800">
              <div>Threat: <span className="text-yellow-300">Recipient Violation</span></div>
              <div>Expected: <span className="text-yellow-300">RECIPIENT BLOCKED</span></div>
            </div>
          </div>

          <button
            onClick={() => runScenario('C')}
            disabled={isRunning}
            className="w-full py-2 px-3 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 hover:bg-yellow-500/30 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Launch Scenario C</span>
          </button>
        </div>
      </div>

      {/* Execution Outcome Box */}
      {outcome && (
        <div
          className={`card p-5 space-y-3 border-2 ${
            outcome.status === 'ALLOW'
              ? 'border-emerald-500/60 bg-emerald-950/20'
              : 'border-red-500/60 bg-red-950/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {outcome.status === 'ALLOW' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <h3 className="text-sm font-bold text-white font-mono">{outcome.title}</h3>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                outcome.status === 'ALLOW'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-red-500/20 text-red-400 border border-red-500/40'
              }`}
            >
              {outcome.status === 'ALLOW' ? 'ACTION ALLOWED' : 'ACTION BLOCKED'}
            </span>
          </div>
          <p className="text-xs text-slate-300 font-mono leading-relaxed">{outcome.summary}</p>
        </div>
      )}

      {/* Detailed Step-by-Step Security Analysis */}
      {steps.length > 0 && (
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider border-b border-slate-800 pb-2">
            Execution Trace & Gateway Evaluation
          </h3>

          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={idx} className="p-4 bg-navy-900 rounded-lg border border-slate-800 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-400">STAGE {step.stepIndex}</span>
                  {step.securityDecision && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        step.securityDecision.decision === EnforcementDecision.ALLOW
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-red-500/20 text-red-400 border border-red-500/40'
                      }`}
                    >
                      {step.securityDecision.decision}
                    </span>
                  )}
                </div>

                <div className="text-slate-300">
                  <span className="text-slate-400 font-semibold">Agent Reason: </span>
                  {step.thought}
                </div>

                {step.actionProposed && (
                  <div className="bg-navy-950 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-400">Proposed Tool Action: </span>
                    <span className="text-purple-300 font-semibold">{step.actionProposed.toolName}</span>
                    <pre className="text-[11px] text-slate-300 mt-1">{JSON.stringify(step.actionProposed.parameters, null, 2)}</pre>
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
                    <span className="font-bold">Policy Rule Enforced: </span>
                    <span>{step.securityDecision.policyRuleTriggered}</span>
                    <p className="mt-0.5 text-slate-300">{step.securityDecision.reasoning}</p>
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
