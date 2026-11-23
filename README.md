# TRACEGUARD AI
### Runtime Security Layer for AI Agents & Autonomous Workflows

[![Vite Build](https://img.shields.io/badge/Vite-8.3.8-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2.4-61DAFB.svg?logo=react)](https://react.dev/)
[![Vitest Tests](https://img.shields.io/badge/Vitest-56%2F56%20Passed-44B78B.svg?logo=vitest)](https://vitest.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-13.4.0-FFCA28.svg?logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.2.1-06B6D4.svg?logo=tailwindcss)](https://tailwindcss.com/)

---

## 🛡️ 1. Project Overview & The Threat Landscape

Autonomous AI agents (powered by OpenAI GPT, Google Gemini, Anthropic Claude, LangChain, CrewAI, AutoGen) are rapidly given access to sensitive environments, internal file stores, email servers, and corporate APIs.

However, modern LLMs remain fundamentally vulnerable to **Indirect Prompt Injection**, **Data Exfiltration via Untrusted Instructions**, and **Excessive Agency**. An agent reading an external untrusted invoice, PDF, or email can be manipulated into executing unauthorized actions (e.g., exfiltrating internal financials or tokens).

**TRACEGUARD AI** is an enterprise-grade runtime security gateway placed between the AI Agent and external tool execution. It enforces **deterministic security contracts**, tracks **causal instruction lineage (DAG Provenance)**, and propagates **multi-dimensional taint flags** before any action can touch production systems.

```
       [User / System Request]
                  │
                  ▼
   ┌─────────────────────────────┐
   │  Execution Contract (Frozen)│  <── Immutable allowed tools, recipients & categories
   └──────────────┬──────────────┘
                  │
                  ▼
   ┌─────────────────────────────┐
   │    Autonomous AI Agent      │  <── Proposes tool action
   └──────────────┬──────────────┘
                  │
                  ▼ (Interception)
   ┌────────────────────────────────────────────────────────┐
   │               TRACEGUARD RUNTIME GATEWAY               │
   │                                                        │
   │  [1. ProvenanceTracker]  ──> DAG Causal Trace          │
   │  [2. TaintEngine]        ──> Taint Flag Analysis       │
   │  [3. PolicyEngine]       ──> Priority Rules (001-009)  │
   │  [4. Cloud/Local Log]    ──> Cloud Firestore Audit     │
   └──────────────┬─────────────────────────────────────────┘
                  │
       ┌──────────┴──────────┐
       ▼                     ▼
 [ALLOW: Sandbox Tool]  [BLOCK: Security Event Logged]
```

---

## 🏆 2. Why TRACEGUARD AI Wins (Hackathon Competitive Advantages)

1. **Deterministic Security vs. LLM "Vibes"**:
   Prompt guards and LLM-as-a-judge classifiers can be jailbroken or bypassed. TRACEGUARD AI enforces deterministic mathematical rules (`RULE_001` through `RULE_009`) with deep-frozen objects that cannot be overridden by prompt engineering.
2. **Deep-Frozen Execution Contracts**:
   Execution contracts utilize recursive `Object.freeze()` on all internal arrays (`allowedTools`, `allowedRecipients`, `restrictedDataCategories`). Even if an injected agent executes `contract.allowedTools.push("send_email")`, the runtime throws or blocks the mutation (`RULE_006`).
3. **Causal Lineage & Provenance Graph**:
   Every instruction, retrieved document, and tool execution is a node in an immutable DAG. The security engine knows the exact ancestry of every token and parameter.
4. **Honest Hybrid Inference Telemetry**:
   Uses Firebase AI Logic (`PREFER_ON_DEVICE` / `ONLY_IN_CLOUD`). Accurately reports whether execution occurred on-device (Chrome Gemini Nano) or via Cloud Vertex AI, with genuine fallback metrics.
5. **OWASP Top 10 for LLMs Alignment**:
   - **LLM01: Prompt Injection** ➔ Mitigated via `RULE_004` & `TaintEngine`.
   - **LLM02: Sensitive Information Disclosure** ➔ Mitigated via `RULE_002` & `RULE_005`.
   - **LLM06: Excessive Agency** ➔ Mitigated via `RULE_001` (Execution Contract Whitelisting).
   - **LLM08: Vector and Embedding Weaknesses** ➔ Mitigated via `ProvenanceTracker`.

---

## 🔬 3. Interactive Attack Scenarios

TRACEGUARD AI includes 5 pre-configured live demonstration scenarios with visible telemetry:

| Scenario | Attack Vector | Security Policy Triggered | Decision |
|---|---|---|---|
| **Scenario A** | Benign User Task (Project Summary) | `RULE_008` (Default Allow Conforming Action) | **ALLOWED** |
| **Scenario B** | Indirect Prompt Injection (Malicious PDF) | `RULE_001` (Unauthorized Tool) & `RULE_004` (Tainted) | **BLOCKED** |
| **Scenario C** | Unauthorized Data Exfiltration (PII to competitor) | `RULE_002` (Recipient Not in Contract Allowlist) | **BLOCKED** |
| **Scenario D** | Sandbox Boundary Escape (`unauthorized_shell_exec`) | `RULE_001` (Tool Not in Contract) | **BLOCKED** |
| **Scenario E** | Permission Escalation (Mutating Contract at Runtime) | `RULE_006` (Contract Immutability Breach) | **BLOCKED** |

---

## ⚡ 4. Installation & Local Development

### Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### Step-by-Step Setup
```bash
# 1. Clone repository
git clone https://github.com/your-org/traceguard-ai.git
cd traceguard-ai

# 2. Install dependencies
npm install

# 3. Configure Environment Variables
cp .env.example .env.local

# 4. Run automated test suites (56 tests)
npm test

# 5. Build for production (Type-check & Bundle)
npm run build

# 6. Launch local dev server
npm run dev
```

---

## 🧪 5. Automated Test Suites & Quality Assurance

TRACEGUARD AI features 56 unit and end-to-end integration tests covering all critical paths:

```bash
npx vitest run
```

```
Test Files  9 passed (9)
     Tests  56 passed (56)
  Duration  2.4s
```

### Verified Test Suites:
1. `tests/PolicyEngine.test.ts` — Priority evaluation of rules `RULE_001` through `RULE_009`.
2. `tests/TaintEngine.test.ts` — Sensitivity inheritance and taint propagation across nodes.
3. `tests/AgentRunner.test.ts` — Execution of Scenarios A, B, C, D, and E through the runtime gate.
4. `tests/audit_verification.test.ts` — Deep immutability checks and policy enforcement verification.
5. `tests/firebase_integration.test.ts` — Cloud Firestore multi-tenant isolation and security rule compliance.
6. `tests/scenario_identity.test.ts` — Independent execution and session isolation under concurrent load.
7. `tests/phase3_features.test.ts` — Provenance lineage and DAG graph consistency.
8. `tests/firebase_ai_live.test.ts` — Live inference probe against Vertex AI.
9. `tests/hybrid_ai_telemetry.test.ts` — Route classification and fallback counters.

---

## ☁️ 6. Firebase Cloud Architecture & Deployment

The application is wired to Google Cloud project `traceguard-ai-448b0`:
- **Cloud Firestore**: Stores append-only audit traces (`execution_traces`, `security_events`, `security_decisions`).
- **Firebase Auth**: Provides UID-based tenant data isolation.
- **Firebase App Check**: Protects cloud APIs with reCAPTCHA Enterprise attestation.
- **Firebase AI Logic**: Hybrid orchestration (Chrome Gemini Nano + Vertex AI Gemini 2.0 Flash).

### Deploying Firestore Security Rules & Indexes:
```bash
# Login to Firebase
firebase login

# Set active project
firebase use traceguard-ai-448b0

# Deploy strictly audited security rules (User isolation & append-only)
firebase deploy --only firestore:rules

# Deploy composite query indexes
firebase deploy --only firestore:indexes
```

---

## 💼 7. Live Demonstration Script for Judges

1. **30-Second Hook**: Open **Dashboard**. Show the live telemetry feed, security gate status (`ENFORCING`), and the 3 quick demo buttons in the header.
2. **Execute Benign Workflow (Scenario A)**:
   - Click `Scenario A`.
   - Show that legitimate queries pass smoothly (`ALLOWED`), generating an AI-assisted summary of Project Alpha.
3. **Execute Attack Vector (Scenario B — Indirect Prompt Injection)**:
   - Click `Scenario B`.
   - Observe the agent attempting to parse an external document containing an adversarial prompt injection payload.
   - TRACEGUARD AI's `RuntimeEnforcement` immediately flags the injected instruction, marks the provenance node as `PROMPT_INJECTION`, and **BLOCKS** the unauthorized `send_email_mock` tool call (`RULE_001` & `RULE_004`).
4. **Inspect Provenance Graph**:
   - Navigate to **Provenance Graph**.
   - Show the interactive causal DAG displaying the root instruction, tainted document node (red), and blocked action attempt.
5. **Inspect Runtime Guard**:
   - Navigate to **Runtime Guard**.
   - Review the deterministic rule table with evaluation priority and hit counts.
6. **Security Audit Reports**:
   - Open **Security Reports** to demonstrate persistent forensic audit logs stored in Cloud Firestore.

---

## 📄 License
MIT License. Built for competition demonstration.
