import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PATTERN_DENYLIST = [
  /([^A-Za-z]|^)sudo\s+/,
  /([^A-Za-z]|^)rm\s+-rf\s+\//,
  /([^A-Za-z]|^)dd\s+if=\/dev\/zero/,
  /:\(\)\s*\{.*:\s*\};\s*:/,
  /([^A-Za-z]|^)jj\s+(describe|rebase|commit|restore|op|squash)/,
  /([^A-Za-z]|^)(sed|awk|env|tmux|screen|patch)\s+/,
  /([^A-Za-z]|^)git\s+(config|commit|rebase|revert|reset|restore|fetch|push|pull)/,
  /([^A-Za-z]|^)rg\s+(-r|-rn)/,
];

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return;
    if (typeof event.input.command !== "string") return;

    const command = event.input.command;

    for (const pattern of PATTERN_DENYLIST) {
      if (pattern.test(command)) {
        ctx.ui.notify(`Blocked: command matched ${pattern}`, "warning");
        return {
          block: true,
          reason: `Blocked: matches forbidden pattern ${pattern}. Please strictly abide to rules, work within the limits and prefer built-in tools.`,
        };
      }
    }
  });
}
