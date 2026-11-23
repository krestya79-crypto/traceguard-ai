import React from 'react'
import { ShieldCheck, LogIn, LogOut, Database, UserCheck, RefreshCw } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface HeaderProps {
  title: string
  subtitle: string
  onQuickRunScenario?: (scenario: 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C') => void
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onQuickRunScenario }) => {
  const { user, loading, isLive, signIn, signOut } = useAuth()

  return (
    <header className="h-16 bg-navy-900/80 border-b border-slate-800/80 px-6 flex items-center justify-between shrink-0 backdrop-blur z-10">
      <div>
        <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          {title}
        </h1>
        <p className="text-xs text-slate-400 font-mono">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {onQuickRunScenario && (
          <div className="hidden xl:flex items-center gap-1.5 bg-navy-950/80 border border-slate-800 p-1 rounded-lg">
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

        {/* Cloud Firestore Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono ${
            isLive
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
          }`}
          title={isLive ? 'Connected to live Firebase Cloud Firestore' : 'Running in local development buffer (unconfigured .env.local)'}
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden md:inline font-semibold">
            {isLive ? 'CLOUD FIRESTORE (LIVE)' : 'LOCAL / OFFLINE BUFFER'}
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
              <UserCheck className="w-4 h-4 text-cyan-400" />
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
                className="ml-1 p-1 hover:text-red-400 text-slate-400 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={signIn}
              disabled={loading || !isLive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                isLive
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-navy-950 shadow-md shadow-cyan-500/10'
                  : 'bg-navy-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-70'
              }`}
              title={isLive ? 'Sign in with Google' : 'Sign in requires valid Firebase config in .env.local'}
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogIn className="w-3.5 h-3.5" />
              )}
              <span>{isLive ? 'Sign In with Google' : 'Local Auth (Demo)'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
