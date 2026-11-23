import React, { useEffect, useState } from 'react'
import {
  FileText,
  Download,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Layers,
  Eye,
  X,
} from 'lucide-react'
import {
  getUserSecurityEvents,
  getUserDecisions,
  getUserSessions,
} from '../firebase/firestore'
import { getCurrentUser } from '../firebase/auth'
import type { FirestoreSecurityEvent, FirestoreSecurityDecision, FirestoreSession } from '../types/firestore'

export const SecurityReports: React.FC = () => {
  const [events, setEvents] = useState<(FirestoreSecurityEvent & { id: string })[]>([])
  const [decisions, setDecisions] = useState<(FirestoreSecurityDecision & { id: string })[]>([])
  const [sessions, setSessions] = useState<(FirestoreSession & { id: string })[]>([])
  const [filterType, setFilterType] = useState<string>('ALL')
  const [activeTab, setActiveTab] = useState<'events' | 'decisions' | 'sessions'>('events')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null)

  const loadData = async () => {
    setLoading(true)
    const activeUid = getCurrentUser()?.uid || 'demo_operator'
    try {
      const [evts, decs, sess] = await Promise.all([
        getUserSecurityEvents(activeUid, 100),
        getUserDecisions(activeUid, 100),
        getUserSessions(activeUid, 50),
      ])
      setEvents(evts)
      setDecisions(decs)
      setSessions(sess)
    } catch (err) {
      console.error('[SecurityReports] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Derived metrics from real Firestore records
  const totalSessionsCount = sessions.length
  const blockedActionsCount = decisions.filter((d) => d.decision === 'BLOCK').length
  const allowedActionsCount = decisions.filter((d) => d.decision === 'ALLOW').length
  const criticalThreatsCount = events.filter((e) => e.severity === 'CRITICAL' || e.severity === 'HIGH').length

  // Categorize attacks by type
  const promptInjectionAttacks = events.filter(
    (e) => e.type.includes('PROMPT_INJECTION') || e.description.toLowerCase().includes('injection')
  ).length
  const exfiltrationAttacks = events.filter(
    (e) => e.type.includes('EXFILTRATION') || e.description.toLowerCase().includes('exfiltration')
  ).length
  const unauthorizedToolAttacks = events.filter(
    (e) => e.type.includes('UNAUTHORIZED_TOOL') || e.type.includes('CONTRACT') || e.description.toLowerCase().includes('contract')
  ).length

  // Export JSON
  const handleExportJSON = () => {
    const activeUid = getCurrentUser()?.uid || 'demo_operator'
    const reportData = {
      reportGeneratedAt: new Date().toISOString(),
      operator: activeUid,
      metrics: {
        totalSessions: totalSessionsCount,
        totalDecisions: decisions.length,
        blockedActions: blockedActionsCount,
        allowedActions: allowedActionsCount,
        threatBreakdown: {
          promptInjection: promptInjectionAttacks,
          dataExfiltration: exfiltrationAttacks,
          unauthorizedTools: unauthorizedToolAttacks,
        },
      },
      sessions,
      securityDecisions: decisions,
      securityEvents: events,
    }
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `traceguard_audit_report_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export CSV
  const handleExportCSV = () => {
    // Generate clean CSV for security events and decisions
    const headers = ['Timestamp', 'RecordType', 'Category/Rule', 'Status/Severity', 'SessionId', 'Description/Reason']
    const rows: string[][] = []

    events.forEach((evt) => {
      rows.push([
        new Date(evt.timestamp).toISOString(),
        'SECURITY_EVENT',
        `"${evt.type.replace(/"/g, '""')}"`,
        evt.severity,
        evt.sessionId || 'SYSTEM',
        `"${evt.description.replace(/"/g, '""')}"`,
      ])
    })

    decisions.forEach((dec) => {
      rows.push([
        new Date(dec.timestamp).toISOString(),
        'ENFORCEMENT_DECISION',
        `"${dec.policyRuleTriggered || 'N/A'}"`,
        dec.decision,
        dec.sessionId || 'SYSTEM',
        `"${dec.reasoning.replace(/"/g, '""')}"`,
      ])
    })

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `traceguard_audit_export_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredEvents = events.filter((e) => {
    if (filterType !== 'ALL' && e.severity !== filterType) return false
    if (searchQuery && !e.description.toLowerCase().includes(searchQuery.toLowerCase()) && !e.type.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  const filteredDecisions = decisions.filter((d) => {
    if (filterType !== 'ALL' && d.decision !== filterType) return false
    if (
      searchQuery &&
      !d.reasoning.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(d.policyRuleTriggered || '').toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100 font-mono uppercase tracking-wider">
              Security Audit & Execution Reports
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="btn-secondary flex items-center gap-1.5 text-xs font-mono"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="btn-secondary flex items-center gap-1.5 text-xs font-mono"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Auditable telemetry persisted in Cloud Firestore collections: <code>agent_sessions</code>, <code>security_decisions</code>, and <code>security_events</code>.
        </p>
      </div>

      {/* Aggregate Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Total Sessions</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{totalSessionsCount}</div>
          <p className="text-[10px] text-slate-400">Agent session runs logged</p>
        </div>

        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Blocked Threats</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-400">{blockedActionsCount}</div>
          <p className="text-[10px] text-slate-400">Enforced by deterministic rules</p>
        </div>

        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Allowed Operations</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{allowedActionsCount}</div>
          <p className="text-[10px] text-slate-400">Contract-verified actions</p>
        </div>

        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Critical Alerts</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">{criticalThreatsCount}</div>
          <p className="text-[10px] text-slate-400">High & critical severity</p>
        </div>
      </div>

      {/* Intercepted Threat Breakdown Banner */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
        <div className="p-3 rounded bg-navy-950 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Prompt Injections Intercepted</div>
            <div className="text-lg font-bold text-amber-300">{promptInjectionAttacks}</div>
          </div>
          <div className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Adversarial
          </div>
        </div>

        <div className="p-3 rounded bg-navy-950 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Exfiltration Attempts Blocked</div>
            <div className="text-lg font-bold text-red-400">{exfiltrationAttacks}</div>
          </div>
          <div className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40">
            Data Breach
          </div>
        </div>

        <div className="p-3 rounded bg-navy-950 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Contract & Tool Violations</div>
            <div className="text-lg font-bold text-cyan-300">{unauthorizedToolAttacks}</div>
          </div>
          <div className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            Boundary
          </div>
        </div>
      </div>

      {/* Filter and Table View Switcher */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => { setActiveTab('events'); setFilterType('ALL'); }}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'events'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Security Events ({events.length})
            </button>
            <button
              onClick={() => { setActiveTab('decisions'); setFilterType('ALL'); }}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'decisions'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Enforcement Decisions ({decisions.length})
            </button>
            <button
              onClick={() => { setActiveTab('sessions'); setFilterType('ALL'); }}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'sessions'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sessions ({sessions.length})
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-2 w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-navy-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 w-full"
              />
            </div>
            <button
              onClick={loadData}
              title="Refresh from Firestore"
              className="p-1.5 rounded bg-navy-950 text-slate-400 hover:text-white border border-slate-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Severity / Decision Filters */}
        {activeTab === 'events' && (
          <div className="flex items-center gap-2 text-xs font-mono pt-2 border-t border-slate-800">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[11px]">Severity:</span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterType(sev)}
                className={`px-2.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  filterType === sev
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-navy-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'decisions' && (
          <div className="flex items-center gap-2 text-xs font-mono pt-2 border-t border-slate-800">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[11px]">Decision:</span>
            {['ALL', 'BLOCK', 'ALLOW', 'APPROVAL_REQUIRED'].map((dec) => (
              <button
                key={dec}
                onClick={() => setFilterType(dec)}
                className={`px-2.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  filterType === dec
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-navy-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {dec}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB: SECURITY EVENTS */}
      {activeTab === 'events' && (
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider border-b border-slate-800 pb-2">
            Security Events Stream ({filteredEvents.length} records)
          </h3>

          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-slate-400">
              No events match the selected criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-navy-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Event Type</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Session</th>
                    <th className="p-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-navy-900/60 transition-colors">
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            evt.severity === 'CRITICAL'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : evt.severity === 'HIGH'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                          }`}
                        >
                          {evt.severity}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-200 whitespace-nowrap">{evt.type}</td>
                      <td className="p-3 text-slate-300 max-w-md truncate">{evt.description}</td>
                      <td className="p-3 text-slate-400 whitespace-nowrap font-mono">
                        {evt.sessionId ? evt.sessionId.substring(0, 8) + '...' : 'System'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedRecord(evt as unknown as Record<string, unknown>)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: ENFORCEMENT DECISIONS */}
      {activeTab === 'decisions' && (
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider border-b border-slate-800 pb-2">
            Runtime Enforcement Decisions ({filteredDecisions.length} records)
          </h3>

          {filteredDecisions.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-slate-400">
              No decisions match criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-navy-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Decision</th>
                    <th className="p-3">Rule Triggered</th>
                    <th className="p-3">Proposed Action</th>
                    <th className="p-3">Reasoning</th>
                    <th className="p-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDecisions.map((dec) => (
                    <tr key={dec.id} className="hover:bg-navy-900/60 transition-colors">
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        {new Date(dec.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            dec.decision === 'ALLOW'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : dec.decision === 'BLOCK'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}
                        >
                          {dec.decision}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-cyan-300 whitespace-nowrap">
                        {dec.policyRuleTriggered || 'N/A'}
                      </td>
                      <td className="p-3 text-purple-300 font-semibold whitespace-nowrap">
                        {String((dec.proposedAction as { toolName?: string })?.toolName || 'tool')}
                      </td>
                      <td className="p-3 text-slate-300 max-w-md truncate">{dec.reasoning}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedRecord(dec as unknown as Record<string, unknown>)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: SESSIONS */}
      {activeTab === 'sessions' && (
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider border-b border-slate-800 pb-2">
            Agent Execution Sessions ({sessions.length} records)
          </h3>

          {sessions.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-slate-400">
              No sessions logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-navy-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">Session ID</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created</th>
                    <th className="p-3">Step Count</th>
                    <th className="p-3">Task Prompt</th>
                    <th className="p-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sessions.map((sess) => (
                    <tr key={sess.id} className="hover:bg-navy-900/60 transition-colors">
                      <td className="p-3 text-cyan-300 font-semibold whitespace-nowrap">
                        {sess.id.substring(0, 10)}...
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                          {sess.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        {new Date(sess.startedAt).toLocaleString()}
                      </td>
                      <td className="p-3 text-slate-200 whitespace-nowrap font-bold">
                        {sess.eventCount || 1}
                      </td>
                      <td className="p-3 text-slate-300 max-w-md truncate">
                        {sess.goal || 'Session execution'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedRecord(sess as unknown as Record<string, unknown>)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal / Overlay for Record Inspector */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-slate-700 rounded-xl p-5 max-w-2xl w-full max-h-[85vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider">
                  Audit Record Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs">
              <pre className="p-4 bg-navy-950 border border-slate-800 rounded-lg text-slate-300 overflow-x-auto text-[11px] leading-relaxed">
                {JSON.stringify(selectedRecord, null, 2)}
              </pre>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="btn-secondary text-xs font-mono px-4 py-1.5"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}