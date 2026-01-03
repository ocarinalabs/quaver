import type {
  HookCallback,
  PreToolUseHookInput,
} from "@anthropic-ai/claude-agent-sdk";

const DANGEROUS_PATTERNS = ["rm -rf /", "mkfs", "dd if="];

export const blockDangerousCommands: HookCallback = (input) => {
  if (input.hook_event_name !== "PreToolUse") {
    return Promise.resolve({});
  }
  const preInput = input as PreToolUseHookInput;
  const command = (preInput.tool_input as Record<string, unknown>)?.command as
    | string
    | undefined;

  for (const pattern of DANGEROUS_PATTERNS) {
    if (command?.includes(pattern)) {
      return Promise.resolve({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `Dangerous command blocked: ${pattern}`,
        },
      });
    }
  }
  return Promise.resolve({});
};

export const protectEnvFiles: HookCallback = (input) => {
  if (input.hook_event_name !== "PreToolUse") {
    return Promise.resolve({});
  }
  const preInput = input as PreToolUseHookInput;
  const filePath = (preInput.tool_input as Record<string, unknown>)
    ?.file_path as string | undefined;

  if (filePath?.endsWith(".env")) {
    return Promise.resolve({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "Cannot modify .env files",
      },
    });
  }
  return Promise.resolve({});
};
