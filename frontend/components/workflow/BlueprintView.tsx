"use client";

import { PipelineState, PhaseLog } from "@/types";
import { PolicyBadge } from "./PolicyBadge";
import { clsx } from "clsx";

interface BlueprintViewProps {
  pipeline: PipelineState;
  onApprove?: () => void;
}

export function BlueprintView({ pipeline, onApprove }: BlueprintViewProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Workflow Pipeline</h2>
          <p className="text-xs text-gray-500 mt-0.5">ID: {pipeline.id.slice(0, 12)}...</p>
        </div>
        <StatusPill status={pipeline.status} />
      </div>

      {/* Phase Timeline */}
      <div className="space-y-0">
        {pipeline.phases.map((phase, idx) => (
          <PhaseRow key={phase.phase} phase={phase} isLast={idx === pipeline.phases.length - 1} />
        ))}
      </div>

      {/* Blueprint Details */}
      {pipeline.blueprint && (
        <div className="bg-surface-2 border border-surface-4 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-gray-300">Generated Blueprint</h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <InfoBlock label="Trigger" value={pipeline.blueprint.trigger} />
            <InfoBlock label="Condition" value={pipeline.blueprint.condition} />
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Actions</p>
            {pipeline.blueprint.steps.map((step) => (
              <div
                key={step.order}
                className="flex items-center justify-between bg-surface-1 border border-surface-3 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-500">#{step.order}</span>
                  <span className="text-sm font-medium">{step.tool}</span>
                </div>
                <PolicyBadge status={step.policyStatus} />
              </div>
            ))}
          </div>

          {/* Error handling */}
          <div className="text-xs text-gray-500">
            Retries: {pipeline.blueprint.errorHandling.retries} • On failure:{" "}
            {pipeline.blueprint.errorHandling.onFailure}
          </div>
        </div>
      )}

      {/* Deployment Info */}
      {pipeline.deploymentResult && (
        <div className="bg-surface-2 border border-accent-green/20 rounded-xl p-5 glow-green">
          <h3 className="text-sm font-medium text-accent-green mb-3">Deployed Successfully</h3>
          <div className="space-y-2 text-xs font-mono">
            <p className="text-gray-400">
              Workflow ID: <span className="text-white">{pipeline.deploymentResult.workflowId}</span>
            </p>
            {pipeline.deploymentResult.webhookUrl && (
              <p className="text-gray-400">
                Webhook: <span className="text-brand-400">{pipeline.deploymentResult.webhookUrl}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Approval Button */}
      {pipeline.status === "awaiting_approval" && onApprove && (
        <div className="bg-surface-2 border border-accent-amber/20 rounded-xl p-5 glow-amber">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-accent-amber">Approval Required</h3>
              <p className="text-xs text-gray-500 mt-1">Some tools require admin authorization</p>
            </div>
            <button
              onClick={onApprove}
              className="bg-accent-amber/20 text-accent-amber text-sm font-medium px-4 py-2 rounded-lg hover:bg-accent-amber/30 transition"
            >
              Approve & Deploy
            </button>
          </div>
        </div>
      )}

      {/* Errors */}
      {pipeline.errors.length > 0 && (
        <div className="bg-surface-2 border border-accent-red/20 rounded-xl p-5 glow-red">
          <h3 className="text-sm font-medium text-accent-red mb-2">Errors</h3>
          {pipeline.errors.map((err, i) => (
            <p key={i} className="text-xs text-gray-400 font-mono">
              {err}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function PhaseRow({ phase, isLast }: { phase: PhaseLog; isLast: boolean }) {
  const icons: Record<string, string> = {
    complete: "✅",
    running: "⏳",
    failed: "❌",
    pending: "○",
    skipped: "⊘",
  };

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex flex-col items-center">
        <span className="text-sm">{icons[phase.status] || "○"}</span>
        {!isLast && <div className="w-px h-full min-h-[20px] bg-surface-4 mt-1" />}
      </div>
      <div className="flex-1 flex items-center justify-between min-w-0">
        <div>
          <p
            className={clsx("text-sm", {
              "text-white font-medium": phase.status === "complete" || phase.status === "running",
              "text-gray-500": phase.status === "pending",
              "text-red-400": phase.status === "failed",
            })}
          >
            Phase {phase.phase}: {phase.name}
          </p>
        </div>
        {phase.durationMs !== undefined && (
          <span className="text-[10px] text-gray-600 font-mono ml-2 shrink-0">
            {phase.durationMs}ms
          </span>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-accent-green/15 text-accent-green border-accent-green/20",
    failed: "bg-accent-red/15 text-accent-red border-accent-red/20",
    awaiting_approval: "bg-accent-amber/15 text-accent-amber border-accent-amber/20",
    deploying: "bg-brand-600/15 text-brand-400 border-brand-500/20",
    parsing: "bg-purple-600/15 text-purple-400 border-purple-500/20",
    blueprint: "bg-purple-600/15 text-purple-400 border-purple-500/20",
    policy_check: "bg-accent-amber/15 text-accent-amber border-accent-amber/20",
  };

  return (
    <span
      className={clsx(
        "text-xs font-medium px-3 py-1 rounded-full border",
        styles[status] || "bg-surface-3 text-gray-400 border-surface-4"
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-1 rounded-lg px-3 py-2 border border-surface-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-white mt-0.5 font-mono">{value}</p>
    </div>
  );
}