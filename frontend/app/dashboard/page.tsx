"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PipelineState, HealthStatus, MCPTool } from "@/types";
import { clsx } from "clsx";
import Link from "next/link";

export default function DashboardPage() {
  const [pipelines, setPipelines] = useState<PipelineState[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [tools, setTools] = useState<MCPTool[]>([]);

  useEffect(() => {
    api.listPipelines().then((d: any) => setPipelines(d || [])).catch(() => {});
    api.healthCheck().then((d: any) => setHealth(d)).catch(() => {});
    api.listTools().then((d: any) => setTools(d || [])).catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Dashboard</h1>

      {/* Health Status */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <HealthCard label="Server" ok={health?.server} />
        <HealthCard label="Archestra" ok={health?.archestra} />
        <HealthCard label="n8n" ok={health?.n8n} />
        <div className="bg-surface-2 border border-surface-4 rounded-xl px-4 py-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">MCP Tools</p>
          <p className="text-2xl font-bold text-brand-400 mt-1">{health?.tools || tools.length}</p>
        </div>
      </div>

      {/* Registered Tools */}
      <div className="bg-surface-1 border border-surface-3 rounded-xl p-5 mb-8">
        <h2 className="text-sm font-medium text-gray-300 mb-3">Registered MCP Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="bg-surface-2 border border-surface-4 rounded-lg px-3 py-2.5"
            >
              <p className="text-xs font-mono text-brand-400">{tool.id}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{tool.description}</p>
              <span className="inline-block mt-1.5 text-[9px] bg-surface-3 text-gray-400 px-2 py-0.5 rounded-full">
                {tool.category}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Pipelines */}
      <div className="bg-surface-1 border border-surface-3 rounded-xl p-5">
        <h2 className="text-sm font-medium text-gray-300 mb-3">Recent Pipelines</h2>
        {pipelines.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            No pipelines yet.{" "}
            <Link href="/" className="text-brand-400 hover:underline">
              Create one →
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {pipelines.slice(0, 10).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-surface-2 border border-surface-4 rounded-lg px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{p.userPrompt}</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                    {p.id.slice(0, 12)} • {new Date(p.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={clsx("text-xs font-medium px-3 py-1 rounded-full border ml-3 shrink-0", {
                    "bg-accent-green/15 text-accent-green border-accent-green/20": p.status === "active",
                    "bg-accent-red/15 text-accent-red border-accent-red/20": p.status === "failed",
                    "bg-accent-amber/15 text-accent-amber border-accent-amber/20":
                      p.status === "awaiting_approval",
                    "bg-brand-600/15 text-brand-400 border-brand-500/20":
                      !["active", "failed", "awaiting_approval"].includes(p.status),
                  })}
                >
                  {p.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HealthCard({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-xl px-4 py-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <span
          className={clsx("w-2.5 h-2.5 rounded-full", {
            "bg-accent-green": ok === true,
            "bg-accent-red": ok === false,
            "bg-gray-600 animate-pulse": ok === undefined,
          })}
        />
        <span className={clsx("text-sm font-medium", ok ? "text-accent-green" : ok === false ? "text-accent-red" : "text-gray-500")}>
          {ok === undefined ? "Checking..." : ok ? "Online" : "Offline"}
        </span>
      </div>
    </div>
  );
}