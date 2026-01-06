# @quaver/core

Framework primitives for building AI agent benchmarks. Provides agent creation, tools, logging, database persistence, and analysis utilities.

> **Note:** Benchmark orchestration, step management, and workflow patterns are in `@quaver/bench`.

## Features

- **Agent Loop** - ToolLoopAgent with automatic tool calling, message pruning, and stop conditions
- **Foundation Tools** - Score tracking, memory, scratchpad, key-value storage
- **Multi-provider Gateway** - Route to OpenAI, Anthropic, Google via Vercel AI Gateway
- **Structured Logging** - Pino-based logging with optional DB persistence
- **SQLite Persistence** - Store runs, steps, tool calls via Turso
- **Post-run Analysis** - Evaluate agent behavior with LLM analysis

## Installation

```bash
bun add @quaver/core
```

## Quick Start

```typescript
import { createAgent } from "@quaver/core/agent";

const { agent, logger } = await createAgent({
  model: "anthropic/claude-sonnet-4-5",
  system: "You are a helpful assistant...",
  state: { score: 500, step: 0 },
});

const result = await agent.generate({
  prompt: "What should I do next?",
});
```

## Modules

### Agent (`@quaver/core/agent`)

Creates a ToolLoopAgent with:

- **Tool registration** - Score, memory, scratchpad, KV tools
- **State management** - Via `experimental_context`
- **Message pruning** - Keeps 40 of 50 recent messages
- **Stop conditions** - `waitForNextStep` tool or 100 tool calls

```typescript
import { createAgent } from "@quaver/core/agent";

const { agent, state, logger } = await createAgent({
  model: "openai/gpt-4o",
  state: initialState,
  useAgentFS: false, // Optional: enable persistent storage
});
```

### Tools (`@quaver/core/tools/*`)

| Tool | Import | Description |
|------|--------|-------------|
| Score | `./tools/score` | `getScore`, `adjustScore` - Track score and events |
| Memory | `./tools/memory` | `readScratchpad`, `writeScratchpad`, `kvGet/Set/Delete/List` |
| Time | `./tools/time` | `waitForNextStep` - Signal step completion |
| AgentFS | `./tools/agentfs` | Persistent file storage (optional) |
| Hello | `./tools/hello` | Simple demo tool |

### Gateway (`@quaver/core/gateway`)

Vercel AI Gateway for multi-provider model routing:

```typescript
import { gateway } from "@quaver/core/gateway";

const model = gateway("openai/gpt-4o");
// Also: anthropic/claude-sonnet-4-5, google/gemini-pro
```

### Logging (`@quaver/core/logging/*`)

Pino-based structured logging with custom methods:

```typescript
import { createLogger } from "@quaver/core/logging/logger";

const logger = createLogger({ level: "verbose" });

logger.thinking("Considering options...");
logger.toolCall("adjustScore", { delta: 10 }, { newScore: 510 });
logger.transition(1, 2, 500);
logger.usage({ inputTokens: 100, outputTokens: 50 });
```

Log levels: `silent` | `minimal` | `normal` | `verbose` | `debug`

### Database (`@quaver/core/db/*`)

SQLite schema via Turso:

| Table | Purpose |
|-------|---------|
| `runs` | Benchmark execution records |
| `steps` | Step transitions and metadata |
| `tool_calls` | Individual tool invocations |
| `usage` | Token counts (input, output, cache) |
| `model_requests` | Prompts sent to models |
| `model_outputs` | Model responses |

```typescript
import { createDbClient } from "@quaver/core/db/client";
import { insertRun, getRun } from "@quaver/core/db/queries";

const db = createDbClient();
await insertRun(db, { benchmark: "my-benchmark", score: 500 });
```

### Analyzer (`@quaver/core/analyzer/*`)

LLM-powered analysis of benchmark runs:

```typescript
import { analyzeRun } from "@quaver/core/analyzer/analyze";

const analysis = await analyzeRun(runId, {
  model: "anthropic/claude-sonnet-4-5",
});
```

## State

### BaseState Interface

```typescript
import type { BaseState } from "@quaver/core/types/state";

type BaseState = {
  step: number;                    // Current simulation step
  waitingForNextStep: boolean;     // Flag to advance step
  score: number;                   // Current score metric
  events: Event[];                 // Score-affecting events
  failureCount: number;            // Consecutive failures
  scratchpad: string;              // Agent notes
  kvStore: Record<string, string>; // Persistent KV data
  agent?: AgentFS;                 // Optional persistent storage
};
```

### Extending State

```typescript
type RideshareState = BaseState & {
  balance: number;
  currentZone: string;
  activeRide: Ride | null;
};
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway token |
| `AI_DEVTOOLS` | Enable AI SDK devtools (`true`) |
| `TURSO_DATABASE_URL` | Turso database connection URL |
| `TURSO_AUTH_TOKEN` | Turso authentication token |

## Exports

| Import Path | Description |
|-------------|-------------|
| `@quaver/core/agent` | Agent factory |
| `@quaver/core/analyzer/analyze` | Run analysis |
| `@quaver/core/analyzer/prompts` | Analysis prompts |
| `@quaver/core/analyzer/tools` | Analysis tools |
| `@quaver/core/db/client` | Database client |
| `@quaver/core/db/queries` | Query functions |
| `@quaver/core/db/schema` | Schema definitions |
| `@quaver/core/gateway` | Model gateway |
| `@quaver/core/logging/logger` | Logger factory |
| `@quaver/core/logging/schemas` | Log schemas |
| `@quaver/core/logging/types` | Logging types |
| `@quaver/core/tools/score` | Score tools |
| `@quaver/core/tools/memory` | Memory tools |
| `@quaver/core/tools/time` | Time/step tools |
| `@quaver/core/tools/agentfs` | AgentFS tools |
| `@quaver/core/tools/hello` | Demo tool |
| `@quaver/core/types/state` | State types |
| `@quaver/core/types/results` | Result types |
| `@quaver/core/utils/cost` | Cost tracking |
| `@quaver/core/utils/fees` | Fee calculations |
| `@quaver/core/utils/results` | Result formatting |

## Related Packages

- `@quaver/bench` - Benchmark boilerplate with step management and workflows
- `@quaver/agent` - Claude Agent SDK wrapper for benchmark generation
- `@quaver/engine` - Sandbox orchestration for running benchmarks
