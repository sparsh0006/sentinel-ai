export interface PolicyRule {
  id: string;
  toolId: string;
  type: "allow" | "deny" | "require_approval";
  conditions: PolicyCondition[];
  description: string;
}

interface PolicyCondition {
  field: string;
  operator: "eq" | "neq" | "in" | "not_in" | "gt" | "lt" | "contains";
  value: any;
}

// ── Default Policy Rules ──────────────────────────────────────

export const defaultPolicies: PolicyRule[] = [
  // Slack policies
  {
    id: "slack-channel-allow",
    toolId: "slack.send_message",
    type: "allow",
    conditions: [
      { field: "channel", operator: "in", value: ["#sales", "#leads", "#sales-alerts", "#high-value-leads"] },
    ],
    description: "Allow sending to sales-related channels",
  },
  {
    id: "slack-channel-deny",
    toolId: "slack.send_message",
    type: "deny",
    conditions: [
      { field: "channel", operator: "in", value: ["#general", "#random", "#announcements"] },
    ],
    description: "Deny automated messages to general channels",
  },

  // Email policies
  {
    id: "email-domain-allow",
    toolId: "email.send_email",
    type: "allow",
    conditions: [
      { field: "to", operator: "not_in", value: ["@competitor.com", "@spam.com"] },
    ],
    description: "Allow emails to non-blocked domains",
  },
  {
    id: "email-volume-approval",
    toolId: "email.send_email",
    type: "require_approval",
    conditions: [],
    description: "Bulk email (>50/hr) requires admin approval",
  },

  // n8n workflow policies
  {
    id: "n8n-create-allow",
    toolId: "n8n.create_workflow",
    type: "allow",
    conditions: [],
    description: "Allow workflow creation with audit logging",
  },
  {
    id: "n8n-activate-allow",
    toolId: "n8n.activate_workflow",
    type: "allow",
    conditions: [],
    description: "Allow workflow activation",
  },
];

// ── Policy Evaluator ──────────────────────────────────────────

export function evaluateLocalPolicy(
  toolId: string,
  args: Record<string, any>
): { decision: "ALLOWED" | "DENIED" | "REQUIRES_APPROVAL"; reason: string } {
  const applicablePolicies = defaultPolicies.filter((p) => p.toolId === toolId);

  // Check deny rules first
  for (const policy of applicablePolicies.filter((p) => p.type === "deny")) {
    if (matchesConditions(policy.conditions, args)) {
      return { decision: "DENIED", reason: policy.description };
    }
  }

  // Check require_approval rules
  for (const policy of applicablePolicies.filter((p) => p.type === "require_approval")) {
    if (matchesConditions(policy.conditions, args)) {
      return { decision: "REQUIRES_APPROVAL", reason: policy.description };
    }
  }

  // Check allow rules
  for (const policy of applicablePolicies.filter((p) => p.type === "allow")) {
    if (matchesConditions(policy.conditions, args)) {
      return { decision: "ALLOWED", reason: policy.description };
    }
  }

  // Default: allow (in production, Archestra handles this more strictly)
  return { decision: "ALLOWED", reason: "No matching deny/approval policy" };
}

function matchesConditions(
  conditions: PolicyCondition[],
  args: Record<string, any>
): boolean {
  if (conditions.length === 0) return true;

  return conditions.every((cond) => {
    const value = args[cond.field];
    switch (cond.operator) {
      case "eq":    return value === cond.value;
      case "neq":   return value !== cond.value;
      case "in":    return Array.isArray(cond.value) && cond.value.some((v: string) => String(value).includes(v));
      case "not_in": return Array.isArray(cond.value) && !cond.value.some((v: string) => String(value).includes(v));
      case "gt":    return value > cond.value;
      case "lt":    return value < cond.value;
      case "contains": return String(value).includes(cond.value);
      default:      return false;
    }
  });
}