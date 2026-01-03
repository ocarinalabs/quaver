import type { SettingSource } from "@anthropic-ai/claude-agent-sdk";

export const DEFAULT_MODEL = "claude-opus-4-5" as const;

export const DEFAULT_TOOLS: string[] = [
  "Read",
  "Write",
  "Edit",
  "Bash",
  "Glob",
  "Grep",
  "Skill",
  "Task",
];

export const DEFAULT_PERMISSION_MODE = "acceptEdits" as const;

export const SETTING_SOURCES: SettingSource[] = ["project"];

export const DEFAULT_SYSTEM_PROMPT = {
  type: "preset",
  preset: "claude_code",
} as const;
