"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { PipelineState } from "@/types";

export function useWorkflow() {
  const [pipeline, setPipeline] = useState<PipelineState | null>(null);
  const [pipelines, setPipelines] = useState<PipelineState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runPipeline = useCallback(async (prompt: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = (await api.runPipeline(prompt)) as PipelineState;
      setPipeline(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPipelines = useCallback(async () => {
    try {
      const result = (await api.listPipelines()) as PipelineState[];
      setPipelines(result);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchPipeline = useCallback(async (id: string) => {
    try {
      const result = (await api.getPipeline(id)) as PipelineState;
      setPipeline(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  const approve = useCallback(async (id: string) => {
    try {
      const result = (await api.approvePipeline(id)) as PipelineState;
      setPipeline(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  return {
    pipeline,
    pipelines,
    loading,
    error,
    runPipeline,
    fetchPipelines,
    fetchPipeline,
    approve,
    clearError: () => setError(null),
  };
}