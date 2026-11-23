import React from 'react'
import { ShieldCheck, LogIn, LogOut, Database, UserCheck, RefreshCw, Sparkles } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface HeaderProps {
  title: string
  subtitle: string
  onQuickRunScenario?: (scenario: 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C') => void
  runningScenario?: string | null
  onOpenJudgePortal?: () => void
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onQuickRunScenario,
  runningScenario,
  onOpenJudgePortal,
}) => {
  const { user, loading, isLive, isJudge, signIn, signInJudge, signOut } = useAuth()

  return (
    <header className="h-16 bg-navy-900/80 border-b border-slate-800/80 px-6 flex items-center justify-between shrink-0 backdrop-blur z-10">
      <div>
        <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          {title}
        </h1>
        <p className="text-xs text-slate-400 font-mono">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {onOpenJudgePortal && (
          <button
            onClick={onOpenJudgePortal}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600/30 text-xs font-mono font-medium transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Judge Portal
          </button>
        )}

        {onQuickRunScenario && (
          <div className="hidden xl:flex items-center gap-1.5 bg-navy-950/80 border border-slate-800 p-1 rounded-lg">
            <span className="text-[10px] text-slate-400 font-mono px-2 uppercase font-medium">Quick Demo:</span>
            <button
              onClick={() => onQuickRunScenario('SCENARIO_A')}
              disabled={!!runningScenario}
              className="text-xs px-2.5 py-1 rounded bg-navy-800 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors font-mono disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {runningScenario === 'SCENARIO_A' && <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />}
              {runningScenario === 'SCENARIO_A' ? 'Running A...' : 'Scenario A'}
            </button>
            <button
              onClick={() => onQuickRunScenario('SCENARIO_B')}
              disabled={!!runningScenario}
              className="text-xs px-2.5 py-1 rounded bg-navy-800 text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors font-mono disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {runningScenario === 'SCENARIO_B' && <RefreshCw className="w-3 h-3 animate-spin text-red-400" />}
              {runningScenario === 'SCENARIO_B' ? 'Running B...' : 'Scenario B'}
            </button>
            <button
              onClick={() => onQuickRunScenario('SCENARIO_C')}
              disabled={!!runningScenario}
              className="text-xs px-2.5 py-1 rounded bg-navy-800 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/10 transition-colors font-mono disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {runningScenario === 'SCENARIO_C' && <RefreshCw className="w-3 h-3 animate-spin text-yellow-400" />}
              {runningScenario === 'SCENARIO_C' ? 'Running C...' : 'Scenario C'}
            </button>
          </div>
        )}

        {/* Cloud Firestore Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono ${
            isLive && user
              ? isJudge
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
          }`}
          title={
            isLive && user
              ? `Connected to live Firebase Cloud Firestore as ${user.email || user.uid}`
              : 'Demo mode in persistent local buffer (Sign in for live Cloud Firestore sync)'
          }
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden md:inline font-semibold">
            {isLive && user
              ? isJudge
                ? 'FIRESTORE (JUDGE DEMO UID)'
                : 'CLOUD FIRESTORE (AUTHENTICATED)'
              : 'LOCAL BUFFER (DEMO MODE)'}
          </span>
        </div>

        {/* Runtime Security Status */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-950 border border-slate-800 text-xs text-slate-300 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="hidden md:inline">Gateway:</span>
          <span className="text-emerald-400 font-semibold">ENFORCING</span>
        </div>

        {/* User Authentication Control */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2 bg-navy-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
              <UserCheck className={`w-4 h-4 ${isJudge ? 'text-purple-400' : 'text-cyan-400'}`} />
              <div className="hidden sm:block text-left">
                <span className="text-slate-200 font-semibold block leading-tight max-w-[120px] truncate">
                  {user.displayName || user.email}
                </span>
                <span className="text-[10px] text-slate-400 block leading-tight">
                  UID: {user.uid.substring(0, 8)}...
                </span>
              </div>
              <button
                onClick={signOut}
                disabled={loading}
                title="Sign Out"
                className="ml-1 p-1 hover:text-red-400 text-slate-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={signInJudge}
                disabled={loading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition-all cursor-pointer"
                title="Instant Judge Evaluation Session without personal Google credentials"
              >
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>Judge Access</span>
              </button>
              <button
                onClick={signIn}
                disabled={loading || !isLive}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                  isLive
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-navy-950 shadow-md shadow-cyan-500/10 cursor-pointer'
                    : 'bg-navy-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-70'
                }`}
                title={isLive ? 'Sign in with Google (Developer Mode)' : 'Sign in requires valid Firebase config'}
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Google Sign In</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
