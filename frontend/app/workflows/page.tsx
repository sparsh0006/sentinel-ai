"use client";

import { useEffect } from "react";
import { useWorkflow } from "@/hooks/useWorkflow";
import { BlueprintView } from "@/components/workflow/BlueprintView";
import { clsx } from "clsx";

export default function WorkflowsPage() {
  const { pipelines, pipeline, fetchPipelines, fetchPipeline, approve } = useWorkflow();

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Workflows</h1>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar List */}
        <div className="col-span-4 space-y-2">
          {pipelines.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No workflows yet</p>
          ) : (
            pipelines.map((p) => (
              <button
                key={p.id}
                onClick={() => fetchPipeline(p.id)}
                className={clsx(
                  "w-full text-left bg-surface-2 border rounded-lg px-4 py-3 transition-all",
                  pipeline?.id === p.id
                    ? "border-brand-500/40 bg-brand-600/5"
                    : "border-surface-4 hover:border-surface-3"
                )}
              >
                <p className="text-sm text-white truncate">{p.userPrompt}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-gray-500 font-mono">
                    {p.id.slice(0, 8)}
                  </span>
                  <span
                    className={clsx("text-[10px] font-medium", {
                      "text-accent-green": p.status === "active",
                      "text-accent-red": p.status === "failed",
                      "text-accent-amber": p.status === "awaiting_approval",
                      "text-brand-400": !["active", "failed", "awaiting_approval"].includes(p.status),
                    })}
                  >
                    {p.status}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail View */}
        <div className="col-span-8">
          {pipeline ? (
            <BlueprintView
              pipeline={pipeline}
              onApprove={
                pipeline.status === "awaiting_approval"
                  ? () => approve(pipeline.id)
                  : undefined
              }
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
              Select a workflow to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}