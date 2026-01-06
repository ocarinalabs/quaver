# @quaver/agent

Claude Agent SDK wrapper for creating coding agents that generate AI benchmarks with customizable tools, hooks, and MCP servers.

## Features

- **SDK Integration** - Built on `@anthropic-ai/claude-agent-sdk`
- **Benchmark Generation** - Generate evaluation environments from descriptions
- **Safety Hooks** - Block dangerous commands and protect sensitive files
- **MCP Support** - Custom tool servers for benchmark-related operations
- **Checkpointing** - Optional session persistence and resumption
- **Message Type Guards** - Type-safe message handling utilities

## Installation

```bash
bun add @quaver/agent
```

## Quick Start

```typescript
import { generateBenchmark, isAssistant, isResult } from "@quaver/agent/agent";

const query = generateBenchmark("Create a benchmark for testing API rate limiting", {
  model: "claude-opus-4-5",
  maxTurns: 10,
});

for await (const message of query) {
  if (isAssistant(message)) {
    console.log("Assistant:", message.message.content);
  }
  if (isResult(message)) {
    console.log("Done! Session ID:", message.sessionId);
  }
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       @quaver/agent                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Generator  │───▶│   Prompts   │───▶│   Query     │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                                     │                 │
│         ▼                                     ▼                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Config    │    │    Hooks    │    │     MCP     │         │
│  │  Constants  │    │   Safety    │    │   Servers   │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              Claude Agent SDK                        │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Modules

### Agent (`@quaver/agent/agent`)

Main generator function and type guards:

```typescript
import {
  generateBenchmark,
  isSystemInit,
  isCompactBoundary,
  isAssistant,
  isResult,
} from "@quaver/agent/agent";

const query = generateBenchmark(description, options);

for await (const message of query) {
  if (isSystemInit(message)) {
    console.log("Session initialized");
  }
  if (isAssistant(message)) {
    // Handle assistant response
  }
  if (isResult(message)) {
    // Query completed
  }
}
```

### Types (`@quaver/agent/types`)

```typescript
import type { GeneratorOptions, Checkpoint } from "@quaver/agent/types";

const options: GeneratorOptions = {
  model: "claude-opus-4-5",
  cwd: "/path/to/project",
  allowedTools: ["Read", "Write", "Bash"],
  permissionMode: "acceptEdits",
  maxTurns: 20,
  maxBudgetUsd: 5.0,
};
```

### GeneratorOptions

| Option | Type | Description |
|--------|------|-------------|
| `model` | string | Model ID (default: `claude-opus-4-5`) |
| `cwd` | string | Working directory |
| `additionalDirectories` | string[] | Extra directories to access |
| `resumeSessionId` | string | Resume previous session |
| `forkSession` | boolean | Fork from resumed session |
| `allowedTools` | string[] | Tools to enable |
| `disallowedTools` | string[] | Tools to disable |
| `permissionMode` | PermissionMode | Tool permission handling |
| `canUseTool` | CanUseTool | Custom tool permission function |
| `hooks` | object | Event hooks |
| `enableCheckpoints` | boolean | Enable session checkpointing |
| `outputFormat` | OutputFormat | Response format |
| `systemPrompt` | object | Custom system prompt |
| `mcpServers` | object | MCP server configurations |
| `agents` | object | Sub-agent definitions |
| `maxTurns` | number | Maximum conversation turns |
| `maxBudgetUsd` | number | Maximum spend limit |
| `maxThinkingTokens` | number | Extended thinking limit |
| `sandbox` | SandboxSettings | Sandbox configuration |
| `betas` | SdkBeta[] | Beta features to enable |
| `abortController` | AbortController | Cancellation signal |

### Constants (`@quaver/agent/config/constants`)

Default configuration values:

```typescript
import {
  DEFAULT_MODEL,
  DEFAULT_TOOLS,
  DEFAULT_PERMISSION_MODE,
  SETTING_SOURCES,
  DEFAULT_SYSTEM_PROMPT,
} from "@quaver/agent/config/constants";

// DEFAULT_MODEL = "claude-opus-4-5"
// DEFAULT_TOOLS = ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Skill", "Task"]
// DEFAULT_PERMISSION_MODE = "acceptEdits"
```

### Hooks (`@quaver/agent/config/hooks`)

Pre-built safety hooks:

```typescript
import {
  blockDangerousCommands,
  protectEnvFiles,
} from "@quaver/agent/config/hooks";

const query = generateBenchmark(description, {
  hooks: {
    PreToolUse: [
      { callback: blockDangerousCommands },
      { callback: protectEnvFiles },
    ],
  },
});
```

| Hook | Description |
|------|-------------|
| `blockDangerousCommands` | Blocks `rm -rf /`, `mkfs`, `dd if=` |
| `protectEnvFiles` | Prevents modification of `.env` files |

### Checkpoints (`@quaver/agent/config/checkpoint`)

Session persistence utilities:

```typescript
import {
  getCheckpointOptions,
  createCheckpoint,
} from "@quaver/agent/config/checkpoint";

// Enable checkpointing in options
const options = {
  ...getCheckpointOptions(true),
  // Adds: enableFileCheckpointing, extraArgs, env
};

// Create checkpoint reference
const checkpoint = createCheckpoint(uuid, turnNumber);
```

### MCP Server (`@quaver/agent/mcp`)

Custom MCP server with benchmark tools:

```typescript
import { benchmarkToolsServer } from "@quaver/agent/mcp";

const query = generateBenchmark(description, {
  mcpServers: {
    "benchmark-tools": benchmarkToolsServer,
  },
});
```

Available tools:
- `mcp__benchmark-tools__get_framework_info` - Get Quaver framework metadata

## CLI

The package includes a `quaver` CLI for generating benchmarks:

```bash
# Generate benchmark from prompt
quaver "Create a benchmark for testing API rate limiting"

# Interactive mode (reads from stdin)
quaver --interactive
```

The CLI outputs JSON-formatted messages with the following types:
- `system_init` - Session initialized
- `assistant` - Agent response
- `result` - Generation completed

## Exports

| Import Path | Description |
|-------------|-------------|
| `@quaver/agent/agent` | Generator function and type guards |
| `@quaver/agent/types` | Type definitions |
| `@quaver/agent/config/constants` | Default values |
| `@quaver/agent/config/hooks` | Safety hooks |
| `@quaver/agent/config/checkpoint` | Checkpoint utilities |
| `@quaver/agent/mcp` | MCP server |

## Dependencies

| Package | Description |
|---------|-------------|
| `@anthropic-ai/claude-agent-sdk` | Core SDK for Claude Code agents |

## Development

```bash
# Build
bun run build

# Type check
bun run check-types

# Watch mode
bun run dev

# Lint
npx ultracite check

# Fix lint issues
npx ultracite fix
```

## License

Private - Internal use only
