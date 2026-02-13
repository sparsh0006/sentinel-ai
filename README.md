# 🏗 AI Automation Architect

> Convert natural language instructions into governed, deployed, and monitored n8n workflows using MCP tools and Archestra policy engine.

## Architecture Overview

```
User → Next.js Frontend → Express Backend → AI Engine
                                              ├── Intent Parser (LLM)
                                              ├── Blueprint Generator
                                              ├── Archestra Policy Engine (MCP Gateway)
                                              ├── n8n MCP Tools (Workflow CRUD)
                                              └── Monitoring & Logging
```

## Folder Structure

```
ai-automation-architect/
├── frontend/                     # Next.js 14 App
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing / prompt input
│   │   ├── dashboard/page.tsx    # Main dashboard
│   │   ├── workflows/page.tsx    # Workflow list & details
│   │   ├── monitoring/page.tsx   # Execution monitoring
│   │   └── api/                  # Next.js API routes (proxy)
│   │       └── chat/route.ts
│   ├── components/
│   │   ├── ui/                   # Reusable UI primitives
│   │   │   └── Button.tsx
│   │   ├── layout/
│   │   │   └── Sidebar.tsx
│   │   ├── workflow/
│   │   │   ├── PromptInput.tsx
│   │   │   ├── BlueprintView.tsx
│   │   │   └── PolicyBadge.tsx
│   │   └── monitoring/
│   │       └── ExecutionLog.tsx
│   ├── lib/
│   │   └── api.ts                # Backend API client
│   ├── hooks/
│   │   └── useWorkflow.ts
│   ├── types/
│   │   └── index.ts
│   ├── styles/
│   │   └── globals.css
│   ├── tailwind.config.ts
│   ├── next.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                      # Express + Node.js Server
│   ├── src/
│   │   ├── index.ts              # Server entry
│   │   ├── routes/
│   │   │   ├── workflow.routes.ts
│   │   │   └── monitoring.routes.ts
│   │   ├── services/
│   │   │   ├── intent.service.ts     # LLM intent parsing
│   │   │   ├── blueprint.service.ts  # Workflow blueprint gen
│   │   │   └── orchestrator.service.ts # Main pipeline
│   │   ├── mcp/
│   │   │   ├── registry.ts           # MCP tool registry
│   │   │   └── executor.ts           # MCP tool executor
│   │   ├── archestra/
│   │   │   ├── client.ts             # Archestra API client
│   │   │   └── policies.ts           # Policy definitions
│   │   ├── n8n/
│   │   │   └── client.ts             # n8n API client
│   │   ├── middleware/
│   │   │   └── errorHandler.ts
│   │   └── utils/
│   │       └── logger.ts
│   ├── config/
│   │   └── default.ts
│   ├── tsconfig.json
│   └── package.json
│
├── docker-compose.yml            # Archestra + n8n + Redis
├── .env.example
└── README.md
```

## Quick Start

### Prerequisites
- Node.js >= 18
- Docker & Docker Compose
- n8n instance (self-hosted or cloud)
- OpenAI API key (or Anthropic)

### 1. Clone & Install

```bash
# Clone
git clone https://github.com/your-repo/ai-automation-architect.git
cd ai-automation-architect

# Backend
cd backend
npm install
cp .env.example .env   # Fill in your keys
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### 2. Start Infrastructure

```bash
# From project root
docker-compose up -d
```

This starts:
- **Archestra Platform** → `http://localhost:3000` (UI) / `http://localhost:9000` (API)
- **n8n** → `http://localhost:5678`
- **Redis** → `localhost:6379`

### 3. Configure
1. Open Archestra UI at `localhost:3000`, register MCP tools
2. Open n8n at `localhost:5678`, generate API key
3. Update `.env` with all credentials
4. Visit `http://localhost:3001` (frontend)

## 10-Phase Workflow

| Phase | Description | Component |
|-------|------------|-----------|
| 1 | Tool Registration | `mcp/registry.ts` |
| 2 | User Input | `PromptInput.tsx` |
| 3 | Intent Parsing | `intent.service.ts` |
| 4 | Blueprint Generation | `blueprint.service.ts` |
| 5 | Policy Evaluation | `archestra/policies.ts` |
| 6 | Approval Flow | `orchestrator.service.ts` |
| 7 | n8n Deployment | `n8n/client.ts` |
| 8 | Runtime Execution | n8n webhook runtime |
| 9 | Monitoring | `monitoring.routes.ts` |
| 10 | Failure Handling | `orchestrator.service.ts` |# sentinel-ai
