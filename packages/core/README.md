# @quaver/core

TypeScript framework for building and running AI agent benchmarks with step-based simulation, scoring, and persistence.

## Features

- **Agent Loop** - ToolLoopAgent with automatic tool calling, message pruning, and stop conditions
- **Step-based Simulation** - Discrete simulation steps with cost/reward mechanics
- **Scoring System** - Track score, events, and calculate metrics per step
- **SQLite Persistence** - Store runs, steps, tool calls, and model outputs via Turso
- **Multi-provider Gateway** - Route to OpenAI, Anthropic, Google via Vercel AI Gateway
- **Structured Logging** - Pino-based logging with optional DB persistence
- **Post-run Analysis** - Evaluate agent behavior with structured LLM analysis
- **Workflow Patterns** - Loop, orchestrator, parallel, sequential, routing

## Installation

```bash
bun add @quaver/core
```

## Quick Start

```typescript
import { createAgent } from "@quaver/core/agent";
import { initializeState } from "@quaver/core/config/init";

// Create agent with initial state
const state = initializeState();
const { agent, logger } = await createAgent("openai/gpt-4o", state);

// Run agent loop
const result = await agent.generate({
  system: "You are a helpful assistant...",
  prompt: "What should I do next?",
});

console.log(`Score: ${state.score}`);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Benchmark Loop                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│  │  Agent  │───▶│  Tools  │───▶│  State  │───▶│ Scoring │      │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘      │
│       │              │              │              │            │
│       ▼              ▼              ▼              ▼            │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│  │ Gateway │    │ Logger  │    │   DB    │    │ Results │      │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Modules

### Agent (`@quaver/core/agent`)

The `createAgent` function creates a ToolLoopAgent with:

- **Tool registration** - Score, memory, scratchpad, and KV tools
- **State management** - Via `experimental_context`
- **Message pruning** - Keeps 40 of 50 recent messages
- **Stop conditions** - `waitForNextStep` tool or 100 tool calls

```typescript
const { agent, state, logger } = await createAgent(model, initialState, {
  useAgentFS: false, // Optional: enable persistent storage
});
```

### Tools (`@quaver/core/tools/*`)

| Tool | Description |
|------|-------------|
| `getScore` | Get current score and recent events |
| `adjustScore` | Modify score with reason (cost/reward/penalty) |
| `waitForNextStep` | Signal step completion |
| `readScratchpad` / `writeScratchpad` | Free-form agent notes |
| `kvGet` / `kvSet` / `kvDelete` / `kvList` | Key-value storage |

### Workflows (`@quaver/core/workflows/*`)

| Pattern | Description |
|---------|-------------|
| **Loop** | Main benchmark loop: agent → step → agent → ... |
| **Orchestrator** | Coordinator breaks task, workers execute in parallel |
| **Routing** | Classify input, route to specialized handlers |
| **Parallel** | Run independent tasks concurrently |
| **Sequential** | Pipeline: generate → evaluate → improve |
| **Evaluator** | Post-run analysis and scoring |

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
| `reasoning_parts` | Extended reasoning breakdowns |

```typescript
import { createDbClient } from "@quaver/core/db/client";
import { insertRun, getRun } from "@quaver/core/db/queries";

const db = createDbClient();
await insertRun(db, { benchmark: "my-benchmark", score: 500 });
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

### Gateway (`@quaver/core/gateway`)

Vercel AI Gateway for multi-provider model routing:

```typescript
import { gateway } from "@quaver/core/gateway";

const model = gateway("openai/gpt-4o");
// Also supports: anthropic/claude-3-5-sonnet, google/gemini-pro
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway token |
| `AI_DEVTOOLS` | Enable AI SDK devtools (`true`) |
| `TURSO_DATABASE_URL` | Turso database connection URL |
| `TURSO_AUTH_TOKEN` | Turso authentication token |

### Constants (`@quaver/core/config/constants`)

| Constant | Default | Description |
|----------|---------|-------------|
| `INITIAL_SCORE` | 500 | Starting score for benchmarks |
| `STEP_COST` | 2 | Score deducted per step |
| `FAILURE_THRESHOLD` | 10 | Consecutive failures before termination |
| `MAX_STEPS` | 7 | Maximum simulation steps |

## State

### BaseState Interface

Benchmarks extend this base state:

```typescript
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
import type { BaseState } from "@quaver/core/types/state";

type RideshareState = BaseState & {
  balance: number;
  currentZone: string;
  activeRide: Ride | null;
};
```

## Exports

| Import Path | Description |
|-------------|-------------|
| `@quaver/core/agent` | Agent factory |
| `@quaver/core/agent/prompts` | System prompt templates |
| `@quaver/core/analyzer/*` | Analysis tools |
| `@quaver/core/config/constants` | Default constants |
| `@quaver/core/config/init` | State initialization |
| `@quaver/core/config/types` | Type definitions |
| `@quaver/core/db/client` | Database client |
| `@quaver/core/db/queries` | Query functions |
| `@quaver/core/db/schema` | Schema definitions |
| `@quaver/core/engine/scoring` | Scoring logic |
| `@quaver/core/engine/step` | Step advancement |
| `@quaver/core/gateway` | Model gateway |
| `@quaver/core/logging/logger` | Logger factory |
| `@quaver/core/tools/*` | Individual tools |
| `@quaver/core/types/state` | State types |
| `@quaver/core/types/results` | Result types |
| `@quaver/core/utils/cost` | Cost tracking |
| `@quaver/core/workflows/*` | Workflow patterns |

## Development

```bash
# Build
bun run build

# Type check
bun run check-types

# Lint
npx ultracite check

# Fix lint issues
npx ultracite fix
```

## License

Private - Internal use only
