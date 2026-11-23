import React, { useEffect, useState } from 'react'
import {
  FileText,
  Download,
  Filter,
  RefreshCw,
  Search,
} from 'lucide-react'
import {
  getUserSecurityEvents,
  getUserDecisions,
  getUserSessions,
} from '../firebase/firestore'
import type { FirestoreSecurityEvent, FirestoreSecurityDecision, FirestoreSession } from '../types/firestore'

export const SecurityReports: React.FC = () => {
  const [events, setEvents] = useState<(FirestoreSecurityEvent & { id: string })[]>([])
  const [decisions, setDecisions] = useState<(FirestoreSecurityDecision & { id: string })[]>([])
  const [sessions, setSessions] = useState<(FirestoreSession & { id: string })[]>([])
  const [filterType, setFilterType] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [evts, decs, sess] = await Promise.all([
        getUserSecurityEvents('demo_operator', 50),
        getUserDecisions('demo_operator', 50),
        getUserSessions('demo_operator', 20),
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

  const handleExportJSON = () => {
    const reportData = {
      reportGeneratedAt: new Date().toISOString(),
      operator: 'demo_operator',
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

  const filteredEvents = events.filter((e) => {
    if (filterType !== 'ALL' && e.severity !== filterType) return false
    if (searchQuery && !e.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100 font-mono uppercase tracking-wider">
              Security Audit & Execution Reports
            </h2>
          </div>
          <button
            onClick={handleExportJSON}
            className="btn-secondary flex items-center gap-2 text-xs font-mono"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Audit JSON</span>
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Historical records of agent sessions, intercepted attacks, and enforcement decisions saved in Cloud Firestore.
        </p>
      </div>

      {/* Filters and Search Bar */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search events description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-navy-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 w-full sm:w-64"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Severity:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterType(sev)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                filterType === sev
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-navy-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
          <button
            onClick={loadData}
            className="p-1.5 rounded bg-navy-950 text-slate-400 hover:text-white border border-slate-800 ml-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider border-b border-slate-800 pb-2">
          Security Events Log ({filteredEvents.length} events)
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
                  <th className="p-3">Session Ref</th>
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
                    <td className="p-3 text-slate-300 max-w-md">{evt.description}</td>
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {evt.sessionId ? evt.sessionId.substring(0, 10) + '...' : 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decisions Log Table */}
      <div className="card p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider border-b border-slate-800 pb-2">
          Runtime Enforcement Decisions ({decisions.length} recorded)
        </h3>

        {decisions.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-slate-400">
            No decisions logged yet.
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
                  <th className="p-3">Enforcement Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {decisions.map((dec) => (
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
                    <td className="p-3 text-slate-300 max-w-md">{dec.reasoning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
