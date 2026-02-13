import { ParsedIntent } from "./intent.service";
import { v4 as uuid } from "uuid";
import { logger } from "../utils/logger";

export interface WorkflowBlueprint {
  id: string;
  trigger: string;
  condition: string;
  steps: BlueprintStep[];
  errorHandling: { retries: number; onFailure: "log" | "alert" | "disable" };
  n8nWorkflow: N8NWorkflowJSON;
  createdAt: string;
}

interface BlueprintStep {
  order: number;
  tool: string;
  args: Record<string, any>;
  policyStatus: "pending" | "allowed" | "denied" | "requires_approval";
}

interface N8NWorkflowJSON {
  name: string;
  nodes: N8NNode[];
  connections: Record<string, any>;
  settings: Record<string, any>;
}

interface N8NNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
}

export function generateBlueprint(intent: ParsedIntent): WorkflowBlueprint {
  const blueprintId = uuid();

  // ── Build condition string ────────────────────────────
  const conditionStr = intent.conditions
    .map((c) => `${c.field} ${c.operator} ${c.value}`)
    .join(" && ") || "always";

  // ── Build blueprint steps ─────────────────────────────
  const steps: BlueprintStep[] = intent.actions.map((action) => ({
    order: action.order,
    tool: action.toolId,
    args: action.args,
    policyStatus: "pending",
  }));

  // ── Generate n8n workflow JSON ────────────────────────
  const n8nWorkflow = buildN8NWorkflow(intent, blueprintId);

  logger.info(`Blueprint generated: ${blueprintId}`, {
    steps: steps.length,
    trigger: intent.trigger,
  });

  return {
    id: blueprintId,
    trigger: intent.trigger,
    condition: conditionStr,
    steps,
    errorHandling: { retries: 3, onFailure: "log" },
    n8nWorkflow,
    createdAt: new Date().toISOString(),
  };
}

// ── n8n Workflow JSON Builder ─────────────────────────────────

function buildN8NWorkflow(
  intent: ParsedIntent,
  blueprintId: string
): N8NWorkflowJSON {
  const nodes: N8NNode[] = [];
  const connections: Record<string, any> = {};
  let xPos = 250;

  // ── 1. Trigger Node ───────────────────────────────────
  const triggerNode = buildTriggerNode(intent.trigger, xPos);
  nodes.push(triggerNode);
  xPos += 250;

  // ── 2. Condition Node (if conditions exist) ───────────
  let lastNodeName = triggerNode.name;

  if (intent.conditions.length > 0) {
    const conditionNode: N8NNode = {
      id: uuid(),
      name: "Check Conditions",
      type: "n8n-nodes-base.if",
      typeVersion: 2,
      position: [xPos, 300],
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
          },
          combinator: "and",
          conditions: intent.conditions.map((c) => ({
            id: uuid(),
            leftValue: `={{ $json["${c.field}"] }}`,
            rightValue: String(c.value),
            operator: mapOperator(c.operator),
          })),
        },
      },
    };
    nodes.push(conditionNode);
    connections[lastNodeName] = {
      main: [[{ node: conditionNode.name, type: "main", index: 0 }]],
    };
    lastNodeName = conditionNode.name;
    xPos += 250;
  }

  // ── 3. Action Nodes ───────────────────────────────────
  intent.actions
    .sort((a, b) => a.order - b.order)
    .forEach((action, idx) => {
      const actionNode = buildActionNode(action, xPos, idx);
      nodes.push(actionNode);

      if (idx === 0) {
        // Connect from condition (true branch) or trigger
        if (intent.conditions.length > 0) {
          connections[lastNodeName] = {
            main: [
              [{ node: actionNode.name, type: "main", index: 0 }], // true
              [], // false — do nothing
            ],
          };
        } else {
          connections[lastNodeName] = {
            main: [[{ node: actionNode.name, type: "main", index: 0 }]],
          };
        }
      } else {
        // Chain action nodes sequentially
        const prevNode = nodes[nodes.length - 2];
        connections[prevNode.name] = {
          main: [[{ node: actionNode.name, type: "main", index: 0 }]],
        };
      }

      lastNodeName = actionNode.name;
      xPos += 250;
    });

  return {
    name: `AI-Workflow-${blueprintId.slice(0, 8)}`,
    nodes,
    connections,
    settings: {
      saveManualExecutions: true,
      callerPolicy: "workflowsFromSameOwner",
      errorWorkflow: "",
    },
  };
}

function buildTriggerNode(trigger: string, x: number): N8NNode {
  switch (trigger) {
    case "webhook":
      return {
        id: uuid(),
        name: "Webhook Trigger",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [x, 300],
        parameters: {
          path: uuid().slice(0, 8),
          httpMethod: "POST",
          responseMode: "onReceived",
          responseData: "allEntries",
        },
      };
    case "schedule":
      return {
        id: uuid(),
        name: "Schedule Trigger",
        type: "n8n-nodes-base.scheduleTrigger",
        typeVersion: 1,
        position: [x, 300],
        parameters: {
          rule: { interval: [{ field: "hours", hoursInterval: 1 }] },
        },
      };
    default:
      return {
        id: uuid(),
        name: "Manual Trigger",
        type: "n8n-nodes-base.manualTrigger",
        typeVersion: 1,
        position: [x, 300],
        parameters: {},
      };
  }
}

function buildActionNode(
  action: { toolId: string; args: Record<string, any>; order: number },
  x: number,
  idx: number
): N8NNode {
  switch (action.toolId) {
    case "slack.send_message":
      return {
        id: uuid(),
        name: `Slack Notify ${idx + 1}`,
        type: "n8n-nodes-base.slack",
        typeVersion: 2,
        position: [x, 300],
        parameters: {
          resource: "message",
          operation: "send",
          channel: { __rl: true, value: action.args.channel || "#sales", mode: "name" },
          text: action.args.text || "🔥 New high-value lead: {{ $json.name }} (Score: {{ $json.lead_score }})",
          otherOptions: {},
        },
      };

    case "email.send_email":
      return {
        id: uuid(),
        name: `Send Email ${idx + 1}`,
        type: "n8n-nodes-base.emailSend",
        typeVersion: 1,
        position: [x, 300],
        parameters: {
          fromEmail: "sales@company.com",
          toEmail: action.args.to || "={{ $json.email }}",
          subject: action.args.subject || "Welcome, {{ $json.name }}! Let's connect",
          text: action.args.body || "Hi {{ $json.name }},\n\nThank you for your interest...",
          options: {},
        },
      };

    default:
      return {
        id: uuid(),
        name: `Action ${idx + 1}`,
        type: "n8n-nodes-base.noOp",
        typeVersion: 1,
        position: [x, 300],
        parameters: {},
      };
  }
}

function mapOperator(op: string): { type: string; operation: string } {
  const map: Record<string, { type: string; operation: string }> = {
    ">":  { type: "number", operation: "gt" },
    "<":  { type: "number", operation: "lt" },
    ">=": { type: "number", operation: "gte" },
    "<=": { type: "number", operation: "lte" },
    "==": { type: "string", operation: "equals" },
    "!=": { type: "string", operation: "notEquals" },
    "contains": { type: "string", operation: "contains" },
  };
  return map[op] || { type: "string", operation: "equals" };
}