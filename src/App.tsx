import { useState } from 'react'
import { Sidebar, type NavTab } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { Dashboard } from './pages/Dashboard'
import { AgentLab } from './pages/AgentLab'
import { AttackSimulator } from './pages/AttackSimulator'
import { ProvenanceGraph } from './pages/ProvenanceGraph'
import { RuntimeGuard } from './pages/RuntimeGuard'
import { SecurityReports } from './pages/SecurityReports'
import { AgentRunner } from './agent/AgentRunner'

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard')

  const getPageInfo = (tab: NavTab): { title: string; subtitle: string } => {
    switch (tab) {
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
      default:
        return { title: 'TRACEGUARD AI', subtitle: 'Runtime Security Layer' }
    }
  }

  const handleQuickRunScenario = async (scenario: 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C') => {
    const runner = new AgentRunner()
    if (scenario === 'SCENARIO_A') await runner.runScenarioA()
    else if (scenario === 'SCENARIO_B') await runner.runScenarioB()
    else if (scenario === 'SCENARIO_C') await runner.runScenarioC()
    setActiveTab('dashboard')
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
          onQuickRunScenario={handleQuickRunScenario}
        />

        <main className="flex-1 overflow-y-auto p-6 bg-navy-950">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <Dashboard onNavigateToTab={setActiveTab} />}
            {activeTab === 'agent-lab' && <AgentLab />}
            {activeTab === 'attack-simulator' && <AttackSimulator />}
            {activeTab === 'provenance-graph' && <ProvenanceGraph />}
            {activeTab === 'runtime-guard' && <RuntimeGuard />}
            {activeTab === 'security-reports' && <SecurityReports />}
          </div>
        </main>
      </div>
    </div>
  )
}
