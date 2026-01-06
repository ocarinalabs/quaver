# @quaver/bench

Template for creating AI agent benchmarks. **Copy this folder and customize the [TODO] sections.**

> This is a boilerplate package, not a reusable library. The code contains placeholder implementations that you must replace with your benchmark-specific logic.

## Features

- **Agent Creation** - Factory functions for single and multi-agent benchmarks
- **Framework Tools** - Score, memory, and step control from @quaver/core
- **Custom Tools** - Template for domain-specific tools
- **State Management** - Type-safe state extending BaseState
- **Simulation Engine** - Step advancement and scoring logic

## Quick Start

1. **Copy this folder** to create a new benchmark:
   ```bash
   cp -r bench benchmarks/my-benchmark
   cd benchmarks/my-benchmark
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Edit the [TODO] sections** in each file (see below)

4. **Run your benchmark**:
   ```bash
   bun run dev
   ```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       @quaver/bench                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Agent     │───▶│   Prompts   │───▶│   Tools     │         │
│  │  Factory    │    │  [TODO]     │    │  [TODO]     │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                                     │                 │
│         ▼                                     ▼                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Config    │    │   Engine    │    │   State     │         │
│  │  [TODO]     │    │  [TODO]     │    │  [TODO]     │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              @quaver/core (Framework)               │       │
│  │  createAgent | tools | logging | db | types | utils │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── index.ts            # Main entry - benchmark loop
├── agent.ts            # Agent creation utilities
├── prompts.ts          # [TODO] System prompt
├── config/
│   ├── constants.ts    # [TODO] INITIAL_SCORE, STEP_COST, etc.
│   ├── types.ts        # [TODO] Your state type
│   └── init.ts         # [TODO] State initialization
├── engine/
│   ├── step.ts         # [TODO] Step transition logic
│   └── scoring.ts      # [TODO] Score calculation
└── tools/
    └── custom.ts       # [TODO] Domain-specific tools
```

---

## Framework Imports from @quaver/core

### Tools

```typescript
// Score management
import { getScoreTool, adjustScoreTool } from "@quaver/core/tools/score";

// Memory (in-memory storage)
import { memoryTools } from "@quaver/core/tools/memory";
// Includes: readScratchpad, writeScratchpad, kvGet, kvSet, kvDelete, kvList

// Persistent storage (requires AgentFS)
import { agentfsTools } from "@quaver/core/tools/agentfs";

// Step control
import { waitForNextStepTool } from "@quaver/core/tools/time";
```

### Agent Factory

```typescript
import { createAgent } from "@quaver/core/agent";

const { agent, logger } = await createAgent({
  model: "anthropic/claude-sonnet-4.5",
  system: SYSTEM_PROMPT,
  state: myState,
  tools: myCustomTools,
});
```

### Logging

```typescript
import { createLogger } from "@quaver/core/logging/logger";

const logger = createLogger("normal"); // silent | minimal | normal | verbose | debug
```

### Database

```typescript
import { createDbClient, insertRun, completeRun } from "@quaver/core/db/client";
import { getRunSteps, getRunToolCalls } from "@quaver/core/db/queries";
```

### Utilities

```typescript
import { applyStepCost } from "@quaver/core/utils/fees";
import { getGenerationCost } from "@quaver/core/utils/cost";
```

### Types

```typescript
import type { BaseState } from "@quaver/core/types/state";
import type { BenchmarkResult } from "@quaver/core/types/results";
```

---

## BaseState Fields

Your state automatically includes these fields from `BaseState`:

| Field | Type | Description |
|-------|------|-------------|
| `step` | `number` | Current simulation step (starts at 1) |
| `waitingForNextStep` | `boolean` | Flag set by `waitForNextStep` tool |
| `score` | `number` | Current score (primary metric) |
| `events` | `Event[]` | History of score-affecting events |
| `failureCount` | `number` | Consecutive failures (triggers termination) |
| `scratchpad` | `string` | Free-form text storage for agent notes |
| `kvStore` | `Record<string, string>` | Key-value storage |
| `agent?` | `AgentFS` | Optional persistent storage instance |

---

## Customization Guide

### 1. Define Your State (`config/types.ts`)

```typescript
import type { BaseState } from "@quaver/core/types/state";

interface TradingState extends BaseState {
  balance: number;
  portfolio: Record<string, number>;
  day: number;
  prices: Record<string, number>;
}

export type { TradingState };
```

### 2. Set Constants (`config/constants.ts`)

```typescript
export const INITIAL_SCORE = 10000;  // Starting balance
export const STEP_COST = 5;          // Daily fee
export const FAILURE_THRESHOLD = 5;  // Max consecutive losses
export const MAX_STEPS = 252;        // Trading days in a year
```

### 3. Initialize State (`config/init.ts`)

```typescript
import { INITIAL_SCORE } from "./constants.js";
import type { TradingState } from "./types.js";

export const createInitialState = (): TradingState => ({
  // BaseState fields
  step: 1,
  waitingForNextStep: false,
  score: INITIAL_SCORE,
  events: [],
  failureCount: 0,
  scratchpad: "",
  kvStore: {},

  // Your fields
  balance: INITIAL_SCORE,
  portfolio: {},
  day: 1,
  prices: { AAPL: 150, GOOGL: 140, MSFT: 380 },
});
```

### 4. Write System Prompt (`prompts.ts`)

```typescript
export const SYSTEM_PROMPT = `You are TradingBot, an autonomous AI trader.

## SITUATION
- Starting balance: $10,000
- Trading fee: $5 per day
- Goal: Maximize portfolio value over 252 trading days

## TOOLS
- buyStock(symbol, shares) - Buy shares
- sellStock(symbol, shares) - Sell shares
- getPortfolio() - View holdings
- getPrices() - Get current prices
- waitForNextStep() - End trading day

## RULES
- Never invest more than 50% in one stock
- Maintain at least $500 cash reserve
`;
```

### 5. Create Custom Tools (`tools/custom.ts`)

```typescript
import { tool } from "ai";
import { z } from "zod";
import type { TradingState } from "../config/types.js";

export const buyStockTool = tool({
  description: "Buy shares of a stock",
  parameters: z.object({
    symbol: z.string().describe("Stock symbol (e.g., AAPL)"),
    shares: z.number().positive().describe("Number of shares to buy"),
  }),
  execute: async ({ symbol, shares }, { experimental_context }) => {
    const state = experimental_context as TradingState;
    const price = state.prices[symbol];

    if (!price) {
      return { success: false, error: "Unknown symbol" };
    }

    const cost = price * shares;
    if (cost > state.balance) {
      return { success: false, error: "Insufficient funds" };
    }

    state.balance -= cost;
    state.portfolio[symbol] = (state.portfolio[symbol] || 0) + shares;

    return {
      success: true,
      bought: { symbol, shares, price, total: cost },
      newBalance: state.balance,
    };
  },
});

export const customTools = {
  buyStock: buyStockTool,
  // ... more tools
};
```

### 6. Implement Step Logic (`engine/step.ts`)

```typescript
import { applyStepCost } from "@quaver/core/utils/fees";
import { STEP_COST } from "../config/constants.js";
import type { TradingState } from "../config/types.js";

export const advanceStep = (state: TradingState) => {
  // Apply daily fee
  applyStepCost(state, STEP_COST);

  // Simulate price changes
  for (const symbol of Object.keys(state.prices)) {
    const change = (Math.random() - 0.5) * 10;
    state.prices[symbol] = Math.max(1, state.prices[symbol] + change);
  }

  // Advance day
  state.day += 1;
  state.step += 1;
  state.waitingForNextStep = false;

  return { day: state.day, prices: state.prices };
};
```

### 7. Define Scoring (`engine/scoring.ts`)

```typescript
import { FAILURE_THRESHOLD } from "../config/constants.js";
import type { TradingState } from "../config/types.js";

export const calculateScore = (state: TradingState): number => {
  // Portfolio value + cash
  let portfolioValue = 0;
  for (const [symbol, shares] of Object.entries(state.portfolio)) {
    portfolioValue += state.prices[symbol] * shares;
  }
  return state.balance + portfolioValue;
};

export const isTerminated = (state: TradingState): boolean => {
  return state.failureCount >= FAILURE_THRESHOLD || state.balance <= 0;
};
```

---

## Running Benchmarks

### Development
```bash
bun run dev  # Watch mode with hot reload
```

### Production
```bash
bun run start
```

### With Different Models
```typescript
import { runBenchmark } from "./index.js";

// Default model
await runBenchmark();

// Specific model
await runBenchmark("openai/gpt-4o");
await runBenchmark("anthropic/claude-sonnet-4.5");
await runBenchmark("google/gemini-2.5-flash");
```

---

---

## Modules

### Agent (`@quaver/bench/agent`)

Agent creation utilities:

```typescript
import {
  createBenchmarkAgent,
  createCustomAgent,
  createMultipleAgents,
  frameworkTools,
  allTools,
} from "@quaver/bench/agent";

// Simple agent creation
const { agent, state, logger } = await createBenchmarkAgent();

// Custom agent
const { agent: customAgent } = await createCustomAgent({
  model: "openai/gpt-4o",
  system: MY_PROMPT,
  state: myState,
  tools: myTools,
});

// Multi-agent benchmark
const agents = await createMultipleAgents([
  { name: "buyer", system: BUYER_PROMPT },
  { name: "seller", system: SELLER_PROMPT },
]);
```

### Config (`@quaver/bench/config/*`)

```typescript
import { INITIAL_SCORE, STEP_COST, MAX_STEPS } from "@quaver/bench/config/constants";
import { createInitialState } from "@quaver/bench/config/init";
import type { YourBenchmarkState } from "@quaver/bench/config/types";
```

### Engine (`@quaver/bench/engine/*`)

```typescript
import { advanceStep } from "@quaver/bench/engine/step";
import { calculateScore, isTerminated } from "@quaver/bench/engine/scoring";
```

### Tools (`@quaver/bench/tools/custom`)

```typescript
import { customTools, getYourDataTool, doYourActionTool } from "@quaver/bench/tools/custom";
```

---

## Exports

| Import Path | Description |
|-------------|-------------|
| `@quaver/bench` | Main entry, runBenchmark() |
| `@quaver/bench/agent` | Agent creation utilities |
| `@quaver/bench/prompts` | System prompts |
| `@quaver/bench/config/constants` | Configuration constants |
| `@quaver/bench/config/types` | State type definitions |
| `@quaver/bench/config/init` | State initialization |
| `@quaver/bench/engine/step` | Step advancement |
| `@quaver/bench/engine/scoring` | Scoring logic |
| `@quaver/bench/tools/custom` | Custom tools |

---

## For Quaver Agent

When creating benchmarks, the quaver agent can:

1. **Read this README** for documentation
2. **Look at `src/agent.ts`** to understand agent creation patterns
3. **Check `node_modules/@quaver/core/package.json`** for available framework exports
4. **Read `node_modules/@quaver/core/dist/*.d.ts`** for type definitions

---

## Development

```bash
# Build
bun run build

# Type check
bun run check-types

# Watch mode
bun run dev

# Lint
bun x ultracite check

# Fix lint issues
bun x ultracite fix
```

---

## Tips

1. **Keep tools focused** - Each tool should do one thing well
2. **Return structured data** - Help the agent understand what happened
3. **Use events** - Track important state changes for debugging
4. **Test incrementally** - Start with simple scenarios before complex ones
5. **Log generously** - Use the logger for debugging during development

---

## License

Private - Internal use only
