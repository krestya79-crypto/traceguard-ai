import React, { useState } from 'react'
import {
  Settings as SettingsIcon,
  Database,
  Shield,
  Cpu,
  Key,
  RefreshCw,
} from 'lucide-react'
import { isFirebaseLive, createSession, getUserSessions } from '../firebase/firestore'
import { getCurrentUser } from '../firebase/auth'
import { getAIInferenceStats, inferenceRouteLabel, useAITelemetry, analyzeInstruction } from '../firebase/ai'

export const Settings: React.FC = () => {
  const [testingFirestore, setTestingFirestore] = useState(false)
  const [firestoreTestResult, setFirestoreTestResult] = useState<string | null>(null)
  const [testingAI, setTestingAI] = useState(false)
  const [aiTestResult, setAiTestResult] = useState<string | null>(null)

  const firebaseOnline = isFirebaseLive()
  const aiStats = useAITelemetry()
  const currentUser = getCurrentUser()

  const handleTestFirestore = async () => {
    setTestingFirestore(true)
    setFirestoreTestResult(null)
    const testUid = currentUser?.uid || 'demo_operator'
    try {
      const sessionId = await createSession({
        userId: testUid,
        goal: 'System diagnostics ping from Settings',
        status: 'COMPLETED',
        contractId: 'diag_contract',
        startedAt: Date.now(),
        eventCount: 1,
        blockedActions: 0,
        allowedActions: 1,
      })
      const sessions = await getUserSessions(testUid, 5)
      const found = sessions.some((s) => s.id === sessionId)
      if (found) {
        setFirestoreTestResult(`SUCCESS: Diagnostic session persisted and read back from Firestore (ID: ${sessionId.substring(0, 12)}...)`)
      } else {
        setFirestoreTestResult(`NOTE: Write acknowledged into buffer.`)
      }
    } catch (err: unknown) {
      setFirestoreTestResult(`ERROR: ${(err as Error).message}`)
    } finally {
      setTestingFirestore(false)
    }
  }

  const handleTestAI = async () => {
    setTestingAI(true)
    setAiTestResult(null)
    try {
      const signal = await analyzeInstruction(
        'Verify document integrity and read internal policy specification',
        'Operator diagnostics execution in Settings panel'
      )
      const stats = getAIInferenceStats()
      setAiTestResult(
        `SUCCESS: AI Risk Signal evaluated (Risk: ${Math.round(signal.riskScore * 100)}%, Route: ${inferenceRouteLabel(
          stats.lastRoute
        )}, Flags: [${signal.flags.join(', ') || 'CLEAN'}])`
      )
    } catch (err: unknown) {
      setAiTestResult(`ERROR: ${(err as Error).message}`)
    } finally {
      setTestingAI(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100 font-mono uppercase tracking-wider">
              System Settings & Integration Diagnostics
            </h2>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            PROJECT: traceguard-ai-448b0
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Inspect cloud service bindings, App Check fraud defense, Vertex AI integration, and runtime security guarantees.
        </p>
      </div>

      {/* Grid of Service Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cloud Firestore Card */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                Cloud Firestore Database
              </h3>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                firebaseOnline
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}
            >
              {firebaseOnline ? 'ONLINE' : 'LOCAL BUFFER'}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Firebase Project:</span>
              <span className="text-cyan-300 font-bold">traceguard-ai-448b0</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Database Instance:</span>
              <span className="text-slate-200 font-semibold">(default)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Rules Enforcement:</span>
              <span className="text-emerald-400 font-semibold">User UID Isolation & Append-Only</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Active Operator UID:</span>
              <span className="text-slate-300 truncate max-w-[180px]">
                {currentUser?.uid || 'demo_operator'}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleTestFirestore}
              disabled={testingFirestore}
              className="btn-secondary w-full flex items-center justify-center gap-2 text-xs font-mono py-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingFirestore ? 'animate-spin' : ''}`} />
              <span>{testingFirestore ? 'Pinging Cloud Firestore...' : 'Test Firestore Read / Write'}</span>
            </button>
            {firestoreTestResult && (
              <p
                className={`mt-2 p-2 rounded text-[11px] font-mono ${
                  firestoreTestResult.startsWith('SUCCESS')
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60'
                    : 'bg-slate-900 text-slate-300 border border-slate-800'
                }`}
              >
                {firestoreTestResult}
              </p>
            )}
          </div>
        </div>

        {/* Firebase AI Logic / Gemini Backend */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                Firebase AI Logic (Gemini)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {inferenceRouteLabel(aiStats.lastRoute)}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Model Identifier:</span>
              <span className="text-slate-200 font-semibold">gemini-2.0-flash</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Cloud Gateway:</span>
              <span className="text-slate-200">firebasevertexai.googleapis.com</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Total Inference Invocations:</span>
              <span className="text-slate-200">
                {aiStats.onDeviceCount + aiStats.cloudCount + aiStats.fallbackCount} calls
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Heuristic Fallbacks:</span>
              <span className="text-amber-300">{aiStats.fallbackCount} (truthful telemetry)</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleTestAI}
              disabled={testingAI}
              className="btn-secondary w-full flex items-center justify-center gap-2 text-xs font-mono py-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingAI ? 'animate-spin' : ''}`} />
              <span>{testingAI ? 'Pinging Vertex Gateway...' : 'Test AI Risk Signal Inference'}</span>
            </button>
            {aiTestResult && (
              <p
                className={`mt-2 p-2 rounded text-[11px] font-mono ${
                  aiTestResult.startsWith('SUCCESS')
                    ? 'bg-cyan-950/40 text-cyan-300 border border-cyan-800/60'
                    : 'bg-slate-900 text-slate-300 border border-slate-800'
                }`}
              >
                {aiTestResult}
              </p>
            )}
          </div>
        </div>

        {/* Firebase App Check & Fraud Defense Card */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                App Check & Fraud Defense
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
              ENFORCEMENT READY
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Attestation Provider:</span>
              <span className="text-slate-200">ReCaptchaEnterpriseProvider (Fraud Defense)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Protected Services:</span>
              <span className="text-slate-200">Cloud Firestore, Firebase AI Vertex Logic</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Local Debug Mode:</span>
              <span className="text-emerald-400">Supported via self.FIREBASE_APPCHECK_DEBUG_TOKEN</span>
            </div>
          </div>

          <div className="p-3 bg-navy-950 rounded border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Firebase Console Tip:</div>
            <p>
              When App Check enforcement is enabled in Firebase Console, register your browser debug token under <strong>App Check &gt; Apps &gt; Manage debug tokens</strong> to authorize localhost origins.
            </p>
          </div>
        </div>

        {/* Deterministic Policy Engine Card */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                Runtime Security Architecture
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              ACTIVE
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Policy Rules:</span>
              <span className="text-cyan-300 font-semibold">9 Evaluated Rules (Priority Ordered)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Fallback Strategy:</span>
              <span className="text-emerald-400 font-semibold">DEFAULT_DENY on unmatched actions</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Contract Integrity:</span>
              <span className="text-slate-200">SHA-256 HMAC (Tamper-Evident)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Taint Propagation:</span>
              <span className="text-slate-200">Explicit lineage tracking via ProvenanceEngine</span>
            </div>
          </div>

          <div className="p-3 bg-navy-950 rounded border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Security Guarantee:</div>
            <p>
              Even if an AI model is compromised or hallucinates, runtime execution contracts and deterministic rules prevent unauthorized tool execution, recipient spoofing, and exfiltration.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}