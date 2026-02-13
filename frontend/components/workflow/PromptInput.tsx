"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  loading: boolean;
}

const SUGGESTIONS = [
  "When a high-value lead submits our form, notify sales on Slack and send a personalized email.",
  "Every Monday at 9am, send a weekly report summary to #marketing channel.",
  "When a support ticket is marked urgent, alert the on-call team on Slack.",
  "When someone signs up, send a welcome email and notify #growth on Slack.",
];

export function PromptInput({ onSubmit, loading }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = () => {
    if (prompt.trim()) onSubmit(prompt.trim());
  };

  return (
    <div className="space-y-4">
      {/* Input Area */}
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
          placeholder="Describe your automation workflow in plain English..."
          rows={4}
          className="w-full bg-surface-2 border border-surface-4 rounded-xl px-5 py-4 text-sm text-white
                     placeholder:text-gray-500 resize-none
                     focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30
                     transition-all duration-200"
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <span className="text-[10px] text-gray-600">⌘ + Enter</span>
          <Button onClick={handleSubmit} loading={loading} size="sm">
            {loading ? "Building..." : "Architect"}
          </Button>
        </div>
      </div>

      {/* Suggestions */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Quick Prompts</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => setPrompt(s)}
              className="text-xs bg-surface-2 border border-surface-4 text-gray-400 px-3 py-1.5 rounded-lg
                         hover:border-brand-500/30 hover:text-brand-400 transition-all duration-150
                         max-w-[300px] truncate"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}