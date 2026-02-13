"use client";

import { clsx } from "clsx";

interface PolicyBadgeProps {
  status: "pending" | "allowed" | "denied" | "requires_approval";
}

export function PolicyBadge({ status }: PolicyBadgeProps) {
  const config = {
    pending:           { label: "Pending",  color: "bg-gray-600/20 text-gray-400 border-gray-600/20" },
    allowed:           { label: "Allowed",  color: "bg-accent-green/15 text-accent-green border-accent-green/20" },
    denied:            { label: "Denied",   color: "bg-accent-red/15 text-accent-red border-accent-red/20" },
    requires_approval: { label: "Needs Approval", color: "bg-accent-amber/15 text-accent-amber border-accent-amber/20" },
  };

  const { label, color } = config[status];

  return (
    <span className={clsx("text-[10px] font-medium px-2.5 py-1 rounded-full border", color)}>
      {label}
    </span>
  );
}