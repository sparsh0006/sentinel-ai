"use client";

import { PromptInput } from "@/components/workflow/PromptInput";
import { BlueprintView } from "@/components/workflow/BlueprintView";
import { useWorkflow } from "@/hooks/useWorkflow";

export default function HomePage() {
  const { pipeline, loading, error, runPipeline, approve } = useWorkflow();

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-brand-400">AI</span> Automation Architect
        </h1>
        <p className="text-sm text-gray-500 mt-2 max-w-lg">
          Describe your workflow in plain English. The system will parse your intent, generate a
          blueprint, validate against Archestra policies, deploy to n8n, and monitor execution.
        </p>
      </div>

      {/* Prompt Input (Phase 2) */}
      <PromptInput onSubmit={runPipeline} loading={loading} />

      {/* Error */}
      {error && (
        <div className="mt-4 bg-red-600/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Pipeline Result */}
      {pipeline && (
        <div className="mt-8">
          <BlueprintView
            pipeline={pipeline}
            onApprove={
              pipeline.status === "awaiting_approval"
                ? () => approve(pipeline.id)
                : undefined
            }
          />
        </div>
      )}

      {/* Architecture Diagram (shown when no pipeline) */}
      {!pipeline && (
        <div className="mt-12 bg-surface-1 border border-surface-3 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4">System Flow</h3>
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            {[
              { icon: "👤", label: "User" },
              { icon: "🧠", label: "AI Engine" },
              { icon: "📋", label: "Blueprint" },
              { icon: "🛡", label: "Archestra" },
              { icon: "⚡", label: "n8n" },
              { icon: "🚀", label: "Execution" },
              { icon: "📊", label: "Monitor" },
            ].map((step, i, arr) => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xl">{step.icon}</span>
                  <span className="text-[10px] text-gray-500">{step.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <span className="text-gray-600 text-xs">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}