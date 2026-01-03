import type {
  AgentDefinition,
  CanUseTool,
  HookCallbackMatcher,
  HookEvent,
  McpServerConfig,
  Options,
  OutputFormat,
  PermissionMode,
  SandboxSettings,
  SdkBeta,
} from "@anthropic-ai/claude-agent-sdk";

export type Checkpoint = {
  id: string;
  description: string;
  timestamp: Date;
};

export type GeneratorOptions = {
  model?: string;
  cwd?: string;
  additionalDirectories?: string[];

  resumeSessionId?: string;
  forkSession?: boolean;

  allowedTools?: string[];
  disallowedTools?: string[];
  permissionMode?: PermissionMode;
  canUseTool?: CanUseTool;

  hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;

  enableCheckpoints?: boolean;

  outputFormat?: OutputFormat;
  systemPrompt?: Options["systemPrompt"];

  mcpServers?: Record<string, McpServerConfig>;
  agents?: Record<string, AgentDefinition>;

  maxTurns?: number;
  maxBudgetUsd?: number;
  maxThinkingTokens?: number;

  sandbox?: SandboxSettings;

  betas?: SdkBeta[];

  abortController?: AbortController;
};
