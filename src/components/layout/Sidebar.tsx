import React from 'react'
import {
  Shield,
  Activity,
  Terminal,
  Zap,
  GitBranch,
  Lock,
  FileText,
  Cpu,
  Database,
} from 'lucide-react'
import { isFirebaseLive } from '../../firebase/firestore'
import { getAIInferenceStats, inferenceRouteLabel } from '../../firebase/ai'

export type NavTab =
  | 'dashboard'
  | 'agent-lab'
  | 'attack-simulator'
  | 'provenance-graph'
  | 'runtime-guard'
  | 'security-reports'

interface SidebarProps {
  activeTab: NavTab
  onSelectTab: (tab: NavTab) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const firebaseOnline = isFirebaseLive()
  const aiStats = getAIInferenceStats()

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Security Dashboard', icon: Activity },
    { id: 'agent-lab', label: 'Agent Lab', icon: Terminal },
    { id: 'attack-simulator', label: 'Attack Simulator', icon: Zap },
    { id: 'provenance-graph', label: 'Provenance Graph', icon: GitBranch },
    { id: 'runtime-guard', label: 'Runtime Guard & Policies', icon: Lock },
    { id: 'security-reports', label: 'Audit & Reports', icon: FileText },
  ]

  return (
    <aside className="w-64 bg-navy-900 border-r border-slate-800 flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/5">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white tracking-wider text-sm font-mono">TRACEGUARD</span>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-mono px-1.5 py-0.2 rounded border border-cyan-500/40">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">Runtime Security Layer</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
          Security Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/60 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Hybrid AI Telemetry & Cloud Indicator Footer */}
      <div className="p-3.5 border-t border-slate-800/80 bg-navy-950/60 space-y-2 text-[11px] font-mono">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            AI Inference:
          </span>
          <span className="text-cyan-300 font-semibold px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
            {inferenceRouteLabel(aiStats.lastRoute)}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            Firestore:
          </span>
          <span
            className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${
              firebaseOnline
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
            }`}
          >
            {firebaseOnline ? 'ONLINE' : 'LOCAL BUFFER'}
          </span>
        </div>

        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/50">
          Deterministic Policy Engine: <span className="text-emerald-400">ENFORCING</span>
        </div>
      </div>
    </aside>
  )
}
