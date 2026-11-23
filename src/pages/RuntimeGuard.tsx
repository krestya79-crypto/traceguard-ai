import React, { useState } from 'react'
import {
  Lock,
  Sliders,
} from 'lucide-react'
import { DEFAULT_POLICY_RULES } from '../security/PolicyEngine'
import { EnforcementDecision } from '../types/security'

export const RuntimeGuard: React.FC = () => {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>('RULE_001')

  const selectedRule = DEFAULT_POLICY_RULES.find((r) => r.id === selectedRuleId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100 font-mono uppercase tracking-wider">
              Deterministic Policy Engine & Runtime Rules
            </h2>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            DETERMINISTIC ENFORCEMENT ACTIVE
          </span>
        </div>
        <p className="text-xs text-slate-400">
          The final execution decision NEVER depends exclusively on an LLM response. The deterministic policy engine evaluates explicit rules in priority order.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules Table */}
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
            <div className="text-center py-6 text-slate-400 text-xs font-mono">Select a rule to view specification.</div>
          )}
        </div>
      </div>
    </div>
  )
}
