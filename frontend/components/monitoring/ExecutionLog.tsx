"use client";

import { clsx } from "clsx";

interface Execution {
  id: string;
  workflowId: string;
  status: "success" | "error" | "running";
  startedAt: string;
  finishedAt?: string;
  mode: string;
  error?: string;
}

interface ExecutionLogProps {
  executions: Execution[];
  summary: {
    total: number;
    success: number;
    error: number;
    running: number;
  };
}

export function ExecutionLog({ executions, summary }: ExecutionLogProps) {
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Total" value={summary.total} color="text-white" />
        <MetricCard label="Success" value={summary.success} color="text-accent-green" />
        <MetricCard label="Errors" value={summary.error} color="text-accent-red" />
        <MetricCard label="Running" value={summary.running} color="text-accent-amber" />
      </div>

      {/* Execution List */}
      <div className="bg-surface-2 border border-surface-4 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-4">
          <h3 className="text-sm font-medium text-gray-300">Recent Executions</h3>
        </div>

        {executions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No executions yet. Trigger the webhook to see results.
          </div>
        ) : (
          <div className="divide-y divide-surface-3">
            {executions.map((exec) => (
              <div key={exec.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusDot status={exec.status} />
                  <div>
                    <p className="text-sm font-mono text-gray-300">#{exec.id}</p>
                    <p className="text-[10px] text-gray-500">
                      {new Date(exec.startedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={clsx("text-xs font-medium", {
                      "text-accent-green": exec.status === "success",
                      "text-accent-red": exec.status === "error",
                      "text-accent-amber": exec.status === "running",
                    })}
                  >
                    {exec.status}
                  </span>
                  {exec.error && (
                    <p className="text-[10px] text-red-400 mt-0.5 max-w-[200px] truncate">
                      {exec.error}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-xl px-4 py-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={clsx("text-2xl font-bold mt-1", color)}>{value}</p>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={clsx("w-2 h-2 rounded-full", {
        "bg-accent-green": status === "success",
        "bg-accent-red": status === "error",
        "bg-accent-amber animate-pulse": status === "running",
      })}
    />
  );
}