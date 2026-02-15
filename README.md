# 🏗️ Sentinel-AI: Governed Automation Architect

Convert natural language instructions into secure, governed, and deployed **n8n workflows** using Archestra's Policy Engine and the Model Context Protocol (MCP).

---

## 🛡️ Role of Archestra

Archestra serves as the **Deterministic Governance Layer** and **High-Performance Gateway**. Instead of allowing the AI to call APIs directly, all actions are brokered through Archestra to ensure enterprise-grade safety.

- **Policy Engine** — Enforces strict rules on tool arguments (e.g., blocking forbidden email domains or restricted Slack channels) before the AI can execute them.
- **MCP Tool Broker** — Centralizes access to the `n8n-mcp` server, allowing the AI to research node schemas, validate JSON, and deploy workflows through a single secure endpoint.
- **Agent-to-Agent (A2A) Orchestration** — The Express backend uses Archestra's A2A protocol to trigger a specialized "Sentinel Agent," keeping the complex reasoning inside a governed sandbox.
- **Zero-Trust Credential Isolation** — The AI remains the "Architect" but never the "Keyholder." Credentials stay in n8n/Vaults, while Archestra manages the authorized tool calls.
- **Security Audit Trail** — Provides a permanent, immutable log of every tool call attempted by the AI, including blocked requests and policy violations.

---

## 🏗️ Architecture Overview

```
User → Next.js Frontend → Express Backend (Broker)
                                |
                                ↓
                        Archestra Platform (Governance)
                          ├── Policy Engine (Safety Shield)
                          ├── Sentinel Agent (Brain)
                          └── MCP Gateway (The Bridge)
                                |
                                ↓
                        n8n Workflow Engine (Execution)
```

---

## 💻 Archestra Integration Snippets

### Governed Tool Brokering (A2A)

The backend delegates the "Architecting" task to an Archestra Agent via the A2A JSON-RPC protocol.

```typescript
// backend/src/services/orchestrator.service.ts
const response = await axios.post(
  `${config.archestra.apiUrl}/v1/a2a/${config.archestra.agentId}`,
  {
    jsonrpc: "2.0",
    id: 1,
    method: "message/send",
    params: {
      message: {
        parts: [{ kind: "text", text: userPrompt }],
      },
    },
  },
  {
    headers: {
      Authorization: `Bearer ${config.archestra.apiKey}`,
      Accept: "application/json, text/event-stream",
    },
  }
);
```

### High-Performance Gateway Communication

The "Broker" tells the Archestra Gateway to execute specific MCP tools only after the Security Engine validates the policy.

```typescript
// backend/src/mcp/executor.ts
const response = await axios.post(
  config.archestra.gatewayUrl,
  {
    jsonrpc: "2.0",
    id: uuid(),
    method: "tools/call",
    params: {
      name: "czlonkowski__n8n-mcp__n8n_create_workflow",
      arguments: validatedWorkflowJson,
    },
  },
  {
    headers: { Authorization: `Bearer ${config.archestra.apiKey}` },
  }
);
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- Docker & Docker Compose
- OpenAI API Key

### 1. Start Infrastructure

```bash
# From project root
docker-compose up -d
```

### 2. Run the n8n-MCP Bridge (Host Machine)

```bash
export N8N_API_URL="http://localhost:5678"
export N8N_API_KEY="your_n8n_key"
export MCP_MODE="sse"
npx -y n8n-mcp
```

### 3. Setup Backend & Frontend

```bash
# In /backend
npm install && npm run dev

# In /frontend
npm install && npm run dev
```

---

## 🔄 10-Phase Governed Workflow

| Phase | Description              | Component                    |
| ----- | ------------------------ | ---------------------------- |
| 1     | Tool Discovery           | Archestra Private Registry   |
| 2     | Natural Language Input   | `PromptInput.tsx`            |
| 3     | A2A Handshake            | `orchestrator.service.ts`    |
| 4     | Governed Reasoning       | Archestra Sentinel Agent     |
| 5     | Policy Evaluation        | Archestra Security Engine    |
| 6     | Node Research            | n8n-mcp via Gateway          |
| 7     | JSON Architecture        | Sentinel Agent Logic         |
| 8     | Brokered Deployment      | `n8n_create_workflow`        |
| 9     | Credential Audit         | n8n Safety Gate              |
| 10    | Audit Logging            | Archestra Event Logs         |

---

## 📂 Folder Structure

```
ai-automation-architect/
├── frontend/                     # Next.js 14 Control Plane
├── backend/                      # Node.js Tool Broker
│   ├── src/
│   │   ├── services/
│   │   │   └── orchestrator.ts   # Main A2A logic
│   │   ├── mcp/
│   │   │   └── executor.ts       # Gateway tool caller
│   │   └── index.ts              # Entry point
├── docker-compose.yml            # Infra (Archestra, n8n, Redis)
└── README.md
```

---

## 📄 License

MIT