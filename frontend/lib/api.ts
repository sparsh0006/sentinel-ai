// ═══════════════════════════════════════════════════════════════
// API CLIENT — Communicates with Express backend
// ═══════════════════════════════════════════════════════════════

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API request failed");
  return data.data as T;
}

export const api = {
  // Pipeline operations
  runPipeline: (prompt: string) =>
    request("/workflows", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }),

  getPipeline: (id: string) => request(`/workflows/${id}`),

  listPipelines: () => request("/workflows"),

  approvePipeline: (id: string) =>
    request(`/workflows/${id}/approve`, { method: "POST" }),

  diagnosePipeline: (id: string) => request(`/workflows/${id}/diagnose`),

  // Tools & Health
  listTools: () => request("/workflows/tools/list"),

  healthCheck: () => request("/workflows/health/status"),

  // Monitoring
  getExecutions: (workflowId: string, limit = 20) =>
    request(`/monitoring/executions/${workflowId}?limit=${limit}`),

  listN8NWorkflows: () => request("/monitoring/workflows"),
};