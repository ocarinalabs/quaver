import type {
  Query,
  SDKAssistantMessage,
  SDKCompactBoundaryMessage,
  SDKResultMessage,
  SDKSystemMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { getCheckpointOptions } from "../config/checkpoint.js";
import {
  DEFAULT_MODEL,
  DEFAULT_PERMISSION_MODE,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TOOLS,
  SETTING_SOURCES,
} from "../config/constants.js";
import type { GeneratorOptions } from "../types/index.js";
import { buildPrompt } from "./prompts.js";

const buildQueryOptions = (options: GeneratorOptions) => ({
  model: options.model ?? DEFAULT_MODEL,
  cwd: options.cwd,
  additionalDirectories: options.additionalDirectories,
  allowedTools: options.allowedTools ?? DEFAULT_TOOLS,
  disallowedTools: options.disallowedTools,
  permissionMode: options.permissionMode ?? DEFAULT_PERMISSION_MODE,
  settingSources: SETTING_SOURCES,
  resume: options.resumeSessionId,
  forkSession: options.forkSession,
  canUseTool: options.canUseTool,
  hooks: options.hooks,
  outputFormat: options.outputFormat,
  systemPrompt: options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
  mcpServers: options.mcpServers,
  agents: options.agents,
  maxTurns: options.maxTurns,
  maxBudgetUsd: options.maxBudgetUsd,
  maxThinkingTokens: options.maxThinkingTokens,
  sandbox: options.sandbox,
  betas: options.betas,
  abortController: options.abortController,
  ...getCheckpointOptions(options.enableCheckpoints ?? false),
});

async function* generateMessages(
  description: string
): AsyncGenerator<SDKUserMessage> {
  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: buildPrompt(description),
    },
  };
}

const generateBenchmark = (
  description: string,
  options: GeneratorOptions = {}
): Query =>
  query({
    prompt: generateMessages(description),
    options: buildQueryOptions(options),
  });

const isSystemInit = (message: unknown): message is SDKSystemMessage =>
  typeof message === "object" &&
  message !== null &&
  "type" in message &&
  message.type === "system" &&
  "subtype" in message &&
  message.subtype === "init";

const isCompactBoundary = (
  message: unknown
): message is SDKCompactBoundaryMessage =>
  typeof message === "object" &&
  message !== null &&
  "type" in message &&
  message.type === "system" &&
  "subtype" in message &&
  message.subtype === "compact_boundary";

const isAssistant = (message: unknown): message is SDKAssistantMessage =>
  typeof message === "object" &&
  message !== null &&
  "type" in message &&
  message.type === "assistant";

const isResult = (message: unknown): message is SDKResultMessage =>
  typeof message === "object" &&
  message !== null &&
  "type" in message &&
  message.type === "result";

export {
  generateBenchmark,
  isSystemInit,
  isCompactBoundary,
  isAssistant,
  isResult,
};
