import React from 'react'
import { ShieldCheck, UserCheck } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle: string
  onQuickRunScenario?: (scenario: 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C') => void
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onQuickRunScenario }) => {
  return (
    <header className="h-16 bg-navy-900/80 border-b border-slate-800/80 px-6 flex items-center justify-between shrink-0 backdrop-blur">
      <div>
        <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          {title}
        </h1>
        <p className="text-xs text-slate-400 font-mono">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {onQuickRunScenario && (
          <div className="hidden lg:flex items-center gap-1.5 bg-navy-950/80 border border-slate-800 p-1 rounded-lg">
            <span className="text-[10px] text-slate-400 font-mono px-2 uppercase font-medium">Quick Demo:</span>
            <button
              onClick={() => onQuickRunScenario('SCENARIO_A')}
              className="text-xs px-2.5 py-1 rounded bg-navy-800 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors font-mono"
            >
              Scenario A
            </button>
            <button
              onClick={() => onQuickRunScenario('SCENARIO_B')}
              className="text-xs px-2.5 py-1 rounded bg-navy-800 text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors font-mono"
            >
              Scenario B
            </button>
            <button
              onClick={() => onQuickRunScenario('SCENARIO_C')}
              className="text-xs px-2.5 py-1 rounded bg-navy-800 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/10 transition-colors font-mono"
            >
              Scenario C
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-950 border border-slate-800 text-xs text-slate-300 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Runtime Security:</span>
          <span className="text-emerald-400 font-semibold">ACTIVE</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-950 border border-slate-800 text-xs text-slate-300 font-mono">
          <UserCheck className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline text-slate-400">Operator:</span>
          <span>Security Admin</span>
        </div>
      </div>
    </header>
  )
}
