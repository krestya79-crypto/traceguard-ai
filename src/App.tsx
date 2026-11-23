import { useState, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Sidebar, type NavTab } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { Dashboard, type ScenarioNotification } from './pages/Dashboard'
import { AgentLab } from './pages/AgentLab'
import { AttackSimulator } from './pages/AttackSimulator'
import { ProvenanceGraph } from './pages/ProvenanceGraph'
import { RuntimeGuard } from './pages/RuntimeGuard'
import { SecurityReports } from './pages/SecurityReports'
import { Settings } from './pages/Settings'
import { JudgePortal } from './pages/JudgePortal'
import { AgentRunner } from './agent/AgentRunner'

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('judge-portal')
  const [activeNotification, setActiveNotification] = useState<ScenarioNotification | null>(null)
  const [runningScenario, setRunningScenario] = useState<string | null>(null)
  const activeExecutionTokenRef = useRef<string | null>(null)

  const getPageInfo = (tab: NavTab): { title: string; subtitle: string } => {
    switch (tab) {
      case 'judge-portal':
        return {
          title: 'Judge Evaluation Portal — Independent Demonstration & Testing',
          subtitle: 'Guided walkthrough, attack comparison lab, and isolated evaluation session',
        }
      case 'dashboard':
        return {
          title: 'Cybersecurity Operations & Threat Monitoring',
          subtitle: 'Live agent execution metrics, risk distribution, and threat interception',
        }
      case 'agent-lab':
        return {
          title: 'Agent Lab — Interactive Execution & Contract Verification',
          subtitle: 'Execute agent workflows protected by runtime contracts and gateway enforcement',
        }
      case 'attack-simulator':
        return {
          title: 'Attack Simulator — Adversarial Prompt Injection & Exfiltration',
          subtitle: 'Demonstration suite of prompt injections, policy violations, and contract bypasses',
        }
      case 'provenance-graph':
        return {
          title: 'Provenance Graph — Instruction & Data Lineage',
          subtitle: 'Track origin, parent-child dependencies, and taint propagation across all events',
        }
      case 'runtime-guard':
        return {
          title: 'Runtime Guard — Deterministic Policy Engine',
          subtitle: 'Inspect active priority rules, deterministic conditions, and enforcement policies',
        }
      case 'security-reports':
        return {
          title: 'Security Audit & Trace Reports',
          subtitle: 'Query historical sessions, trace events, and decisions recorded in Cloud Firestore',
        }
      case 'settings':
        return {
          title: 'System Settings & Cloud Diagnostics',
          subtitle: 'Inspect Firebase project configurations, App Check attestation, and Vertex AI routes',
        }
      default:
        return { title: 'TRACEGUARD AI', subtitle: 'Runtime Security Layer' }
    }
  }

  const handleRunScenario = async (scenario: 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C') => {
    if (runningScenario) {
      console.warn(`[App] Scenario ${runningScenario} is already executing. Ignoring trigger for ${scenario}.`)
      return
    }

    const token = uuidv4()
    activeExecutionTokenRef.current = token
    setRunningScenario(scenario)

    const titles: Record<string, string> = {
      SCENARIO_A: 'Scenario A: Benign Task Workflow',
      SCENARIO_B: 'Scenario B: Indirect Prompt Injection',
      SCENARIO_C: 'Scenario C: Unauthorized Data Exfiltration',
    }

    // Immediately clear previous notification and show active execution progress
    setActiveNotification({
      executionId: token,
      scenario,
      title: titles[scenario] || scenario,
      status: 'RUNNING',
      message: `Executing ${titles[scenario] || scenario} through TRACEGUARD Runtime Security Layer...`,
      timestamp: Date.now(),
    })

    setActiveTab('dashboard')

    const runner = new AgentRunner()
    try {
      if (scenario === 'SCENARIO_A') {
        const res = await runner.runScenarioA()
        if (activeExecutionTokenRef.current === token) {
          setActiveNotification({
            executionId: token,
            scenario,
            title: titles[scenario],
            status: res.success ? 'ALLOW' : 'BLOCK',
            message: 'Scenario A Completed: Legitimate action ALLOWED. Summary generated.',
            timestamp: Date.now(),
          })
        }
      } else if (scenario === 'SCENARIO_B') {
        const res = await runner.runScenarioB()
        if (activeExecutionTokenRef.current === token) {
          setActiveNotification({
            executionId: token,
            scenario,
            title: titles[scenario],
            status: 'BLOCK',
            message: `Scenario B Completed: Indirect Prompt Injection detected. Action BLOCKED (${res.violationReason}).`,
            timestamp: Date.now(),
          })
        }
      } else if (scenario === 'SCENARIO_C') {
        const res = await runner.runScenarioC()
        if (activeExecutionTokenRef.current === token) {
          setActiveNotification({
            executionId: token,
            scenario,
            title: titles[scenario],
            status: 'BLOCK',
            message: `Scenario C Completed: Unauthorized Data Exfiltration BLOCKED (${res.violationReason}).`,
            timestamp: Date.now(),
          })
        }
      }
    } catch (err) {
      if (activeExecutionTokenRef.current === token) {
        setActiveNotification({
          executionId: token,
          scenario,
          title: titles[scenario],
          status: 'ERROR',
          message: `Execution Error: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: Date.now(),
        })
      }
    } finally {
      if (activeExecutionTokenRef.current === token) {
        setRunningScenario(null)
      }
    }
  }

  const handleAttackScenarioStarted = (
    scenario: 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C' | 'SCENARIO_D' | 'SCENARIO_E'
  ) => {
    const token = uuidv4()
    activeExecutionTokenRef.current = token
    setRunningScenario(scenario)
    setActiveNotification({
      executionId: token,
      scenario,
      title: scenario,
      status: 'RUNNING',
      message: `Executing ${scenario} in Attack Simulator...`,
      timestamp: Date.now(),
    })
  }

  const handleAttackScenarioCompleted = (
    scenario: 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C' | 'SCENARIO_D' | 'SCENARIO_E',
    status: 'ALLOW' | 'BLOCK' | 'ERROR',
    message: string
  ) => {
    const token = activeExecutionTokenRef.current || uuidv4()
    setActiveNotification({
      executionId: token,
      scenario,
      title: scenario,
      status,
      message,
      timestamp: Date.now(),
    })
    setRunningScenario(null)
  }

  const { title, subtitle } = getPageInfo(activeTab)

  return (
    <div className="flex h-screen bg-navy-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={title}
          subtitle={subtitle}
          onQuickRunScenario={handleRunScenario}
          runningScenario={runningScenario}
          onOpenJudgePortal={() => setActiveTab('judge-portal')}
        />

        <main className="flex-1 overflow-y-auto p-6 bg-navy-950">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'judge-portal' && (
              <JudgePortal onExitJudgeMode={() => setActiveTab('dashboard')} />
            )}
            {activeTab === 'dashboard' && (
              <Dashboard
                onNavigateToTab={setActiveTab}
                executionNotification={activeNotification}
                onClearNotification={() => setActiveNotification(null)}
                onRunScenario={handleRunScenario}
                runningScenario={runningScenario}
              />
            )}
            {activeTab === 'agent-lab' && <AgentLab />}
            {activeTab === 'attack-simulator' && (
              <AttackSimulator
                onScenarioStarted={handleAttackScenarioStarted}
                onScenarioCompleted={handleAttackScenarioCompleted}
              />
            )}
            {activeTab === 'provenance-graph' && <ProvenanceGraph />}
            {activeTab === 'runtime-guard' && <RuntimeGuard />}
            {activeTab === 'security-reports' && <SecurityReports />}
            {activeTab === 'settings' && <Settings />}
          </div>
        </main>
      </div>
    </div>
  )
}
