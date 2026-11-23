import React, { useEffect, useState } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Zap,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  getDashboardStats,
  getUserSecurityEvents,
  getUserSessions,
} from '../firebase/firestore'
import { getCurrentUser } from '../firebase/auth'
import { getAIInferenceStats, inferenceRouteLabel } from '../firebase/ai'
import { AgentRunner } from '../agent/AgentRunner'
import type { FirestoreSecurityEvent, FirestoreSession } from '../types/firestore'

interface DashboardProps {
  onNavigateToTab: (tab: 'dashboard' | 'agent-lab' | 'attack-simulator' | 'provenance-graph' | 'runtime-guard' | 'security-reports') => void
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToTab }) => {
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalToolExecutions: 0,
    blockedActions: 0,
    allowedActions: 0,
    approvalRequired: 0,
    criticalAlerts: 0,
  })

  const [recentEvents, setRecentEvents] = useState<(FirestoreSecurityEvent & { id: string })[]>([])
  const [recentSessions, setRecentSessions] = useState<(FirestoreSession & { id: string })[]>([])
  const [runningScenario, setRunningScenario] = useState<string | null>(null)
  const [executionMessage, setExecutionMessage] = useState<string | null>(null)

  const aiStats = getAIInferenceStats()

  const loadData = async () => {
    try {
      const activeUid = getCurrentUser()?.uid || 'demo_operator'
      const s = await getDashboardStats(activeUid)
      setStats(s)
      const evts = await getUserSecurityEvents(activeUid, 10)
      setRecentEvents(evts)
      const sess = await getUserSessions(activeUid, 5)
      setRecentSessions(sess)
    } catch (err) {
      console.error('[Dashboard] Error fetching stats:', err)
    }
  }

  useEffect(() => {
    loadData()
    const timer = setInterval(() => {
      loadData()
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const handleRunDemoScenario = async (scenario: 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C') => {
    setRunningScenario(scenario)
    setExecutionMessage(`Executing ${scenario} through TRACEGUARD Runtime Security Layer...`)
    const runner = new AgentRunner()

    try {
      if (scenario === 'SCENARIO_A') {
        await runner.runScenarioA()
        setExecutionMessage(`Scenario A Completed: Legitimate action ALLOWED. Summary generated.`)
      } else if (scenario === 'SCENARIO_B') {
        const res = await runner.runScenarioB()
        setExecutionMessage(`Scenario B Completed: Indirect Prompt Injection detected. Action BLOCKED (${res.violationReason}).`)
      } else if (scenario === 'SCENARIO_C') {
        const res = await runner.runScenarioC()
        setExecutionMessage(`Scenario C Completed: Unauthorized Data Exfiltration BLOCKED (${res.violationReason}).`)
      }
      await loadData()
    } catch (err) {
      setExecutionMessage(`Execution Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setRunningScenario(null)
    }
  }

  // Chart data calculations
  const decisionChartData = [
    { name: 'Blocked', value: stats.blockedActions || 0, color: '#ef4444' },
    { name: 'Allowed', value: stats.allowedActions || 0, color: '#10b981' },
    { name: 'Approval Required', value: stats.approvalRequired || 0, color: '#f59e0b' },
  ].filter((d) => d.value > 0)

  const threatCategoriesData = [
    { category: 'Contract Violations', count: recentEvents.filter((e) => e.type === 'CONTRACT_VIOLATION' || e.type === 'TOOL_BLOCKED').length },
    { category: 'Prompt Injections', count: recentEvents.filter((e) => e.type === 'PROMPT_INJECTION_DETECTED').length },
    { category: 'Taint Detected', count: recentEvents.filter((e) => e.type === 'TAINT_PROPAGATION').length },
    { category: 'Policy Triggers', count: recentEvents.filter((e) => e.type === 'POLICY_VIOLATION').length },
  ]

  return (
    <div className="space-y-6">
      {/* Top Banner / Live Simulation Trigger */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 border border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              TRACEGUARD AI Active Runtime Security Guard
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic policy enforcement, real-time provenance tracking, and taint propagation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">Launch Demo:</span>
          <button
            onClick={() => handleRunDemoScenario('SCENARIO_A')}
            disabled={runningScenario !== null}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 font-mono flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Play className="w-3 h-3" /> Scenario A (Allow)
          </button>
          <button
            onClick={() => handleRunDemoScenario('SCENARIO_B')}
            disabled={runningScenario !== null}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 font-mono flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <ShieldAlert className="w-3 h-3" /> Scenario B (Injection)
          </button>
          <button
            onClick={() => handleRunDemoScenario('SCENARIO_C')}
            disabled={runningScenario !== null}
            className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 font-mono flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <AlertTriangle className="w-3 h-3" /> Scenario C (Exfil)
          </button>
        </div>
      </div>

      {executionMessage && (
        <div className="p-3 bg-navy-900 border border-cyan-500/40 rounded-lg text-xs font-mono text-cyan-300 flex items-center justify-between animate-slide-in">
          <span>{executionMessage}</span>
          <button onClick={() => setExecutionMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="card p-4 space-y-1">
          <span className="text-[11px] font-mono text-slate-400">Total Sessions</span>
          <div className="text-2xl font-bold text-white font-mono">{stats.totalSessions}</div>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400" /> Monitored Agents
          </span>
        </div>

        <div className="card p-4 space-y-1">
          <span className="text-[11px] font-mono text-slate-400">Tool Executions</span>
          <div className="text-2xl font-bold text-cyan-400 font-mono">{stats.totalToolExecutions}</div>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" /> Gateway Checked
          </span>
        </div>

        <div className="card p-4 space-y-1 border-red-500/30 bg-red-950/10">
          <span className="text-[11px] font-mono text-red-400">Blocked Actions</span>
          <div className="text-2xl font-bold text-red-400 font-mono">{stats.blockedActions}</div>
          <span className="text-[10px] text-red-400/80 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Policy Violations
          </span>
        </div>

        <div className="card p-4 space-y-1 border-emerald-500/30 bg-emerald-950/10">
          <span className="text-[11px] font-mono text-emerald-400">Allowed Actions</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{stats.allowedActions}</div>
          <span className="text-[10px] text-emerald-400/80 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Contract Compliant
          </span>
        </div>

        <div className="card p-4 space-y-1 border-yellow-500/30 bg-yellow-950/10">
          <span className="text-[11px] font-mono text-yellow-400">Approvals Required</span>
          <div className="text-2xl font-bold text-yellow-400 font-mono">{stats.approvalRequired}</div>
          <span className="text-[10px] text-yellow-400/80 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Human Gate
          </span>
        </div>

        <div className="card p-4 space-y-1 border-purple-500/30 bg-purple-950/10">
          <span className="text-[11px] font-mono text-purple-400">Critical Alerts</span>
          <div className="text-2xl font-bold text-purple-400 font-mono">{stats.criticalAlerts}</div>
          <span className="text-[10px] text-purple-400/80 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Injection / Threat
          </span>
        </div>
      </div>

      {/* Hybrid AI & Architecture Telemetry Card */}
      <div className="card p-4 border border-cyan-500/30 bg-navy-900/90 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider">
              Hybrid AI Inference Telemetry
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Route Status:</span>
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
              {inferenceRouteLabel(aiStats.lastRoute)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-navy-950/70 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block">On-Device Calls</span>
            <span className="text-lg font-bold text-white">{aiStats.onDeviceCount}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Gemini Nano (Local)</span>
          </div>
          <div className="bg-navy-950/70 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Cloud Model Calls</span>
            <span className="text-lg font-bold text-cyan-400">{aiStats.cloudCount}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Gemini 2.0 Flash</span>
          </div>
          <div className="bg-navy-950/70 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Fallbacks Applied</span>
            <span className="text-lg font-bold text-yellow-400">{aiStats.fallbackCount}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Offline / Dev Engine</span>
          </div>
          <div className="bg-navy-950/70 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Enforcement Engine</span>
            <span className="text-lg font-bold text-emerald-400">100% Deterministic</span>
            <span className="text-[9px] text-emerald-400/80 block mt-0.5">LLM Never Alone</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Enforcement Outcomes Pie Chart */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
              Enforcement Decisions Distribution
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Real-time Policy Results</span>
          </div>

          <div className="h-60 flex items-center justify-center">
            {decisionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={decisionChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {decisionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#060f2e', borderColor: '#334155', color: '#f1f5f9', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs font-mono">
                No decisions recorded yet. Run a scenario above.
              </div>
            )}
          </div>

          <div className="flex items-center justify-around text-xs font-mono pt-2 border-t border-slate-800/80">
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              Blocked ({stats.blockedActions})
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Allowed ({stats.allowedActions})
            </span>
            <span className="flex items-center gap-1.5 text-yellow-400">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              Approval Req ({stats.approvalRequired})
            </span>
          </div>
        </div>

        {/* Security Threat Categories Bar Chart */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
              Security Event Categories
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Threat Breakdown</span>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={threatCategoriesData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#060f2e', borderColor: '#334155', color: '#f1f5f9', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="count" fill="#00d4ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Security Events & Agent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Security Events */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" /> Recent Security Events
            </h3>
            <button
              onClick={() => onNavigateToTab('security-reports')}
              className="text-[11px] text-cyan-400 hover:underline font-mono"
            >
              View Full Audit →
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {recentEvents.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 font-mono">
                No security alerts registered. Run Scenario B or C to trigger events.
              </div>
            ) : (
              recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 bg-navy-900 rounded-lg border border-slate-800 flex items-start justify-between gap-3 text-xs font-mono"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          evt.severity === 'CRITICAL'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : evt.severity === 'HIGH'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                        }`}
                      >
                        {evt.severity}
                      </span>
                      <span className="font-semibold text-slate-200">{evt.type}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{evt.description}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Latest Agent Sessions & Decisions */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" /> Active & Recent Agent Sessions
            </h3>
            <button
              onClick={() => onNavigateToTab('agent-lab')}
              className="text-[11px] text-cyan-400 hover:underline font-mono"
            >
              Open Agent Lab →
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {recentSessions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 font-mono">
                No sessions executed yet.
              </div>
            ) : (
              recentSessions.map((s) => (
                <div
                  key={s.id}
                  className="p-3 bg-navy-900 rounded-lg border border-slate-800 flex items-center justify-between gap-3 text-xs font-mono"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-medium text-slate-200 truncate">{s.goal}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>ID: {s.id.substring(0, 12)}...</span>
                      <span>•</span>
                      <span className="text-emerald-400">Allowed: {s.allowedActions}</span>
                      <span>•</span>
                      <span className="text-red-400">Blocked: {s.blockedActions}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                      s.status === 'COMPLETED'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : s.status === 'BLOCKED'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
