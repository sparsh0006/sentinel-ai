"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { ExecutionLog } from "@/components/monitoring/ExecutionLog";
import { Button } from "@/components/ui/Button";

export default function MonitoringPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWf, setSelectedWf] = useState<string>("");
  const [execData, setExecData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listN8NWorkflows().then((d: any) => setWorkflows(d || [])).catch(() => {});
  }, []);

  const fetchExecs = async () => {
    if (!selectedWf) return;
    setLoading(true);
    try {
      const data = await api.getExecutions(selectedWf);
      setExecData(data);
    } catch {
      // handle
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Monitoring</h1>

      {/* Workflow Selector */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={selectedWf}
          onChange={(e) => setSelectedWf(e.target.value)}
          className="bg-surface-2 border border-surface-4 text-sm text-white rounded-lg px-4 py-2.5
                     focus:outline-none focus:border-brand-500"
        >
          <option value="">Select a workflow...</option>
          {workflows.map((wf: any) => (
            <option key={wf.id} value={wf.id}>
              {wf.name} ({wf.id})
            </option>
          ))}
        </select>
        <Button onClick={fetchExecs} loading={loading} variant="secondary" size="sm">
          Load Executions
        </Button>
      </div>

      {/* Execution Data */}
      {execData ? (
        <ExecutionLog executions={execData.data} summary={execData.summary} />
      ) : (
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">
            Select a workflow and load executions to view monitoring data.
          </p>
        </div>
      )}
    </div>
  );
}