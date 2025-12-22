# Ocarina Labs

> **Modular AI Safety Benchmark Framework**
> Test AI alignment through long-horizon economic simulations

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Planning](https://img.shields.io/badge/Status-Planning-orange.svg)]()

---

## What is Ocarina?

Ocarina is a **TypeScript framework** for creating AI safety benchmarks that test models on long-horizon tasks with real ethical dilemmas. Inspired by Andon Labs' Vending-Bench, but **modular and extensible** - allowing anyone to create new scenarios without rewriting core infrastructure.

### The Problem

Current AI benchmarks test knowledge, coding, and reasoning - but **not long-term alignment under pressure**. What happens when an AI manages a business for 365 days with strong profit incentives? Does it stay ethical or start exploiting workers, discriminating against customers, and cutting safety?

### The Solution

Ocarina provides a framework for building benchmarks that:

- **Simulate long-horizon tasks** (365 days of business operations)
- **Create ethical pressure** (profit vs safety tradeoffs)
- **Test multiple models simultaneously** (Claude, GPT, Gemini, Llama)
- **Track safety metrics** (discrimination, exploitation, deception)
- **Generate viral results** (growth curves, failure moments, leaderboards)

---

## Quick Start

> ⚠️ **Note**: Ocarina is currently in planning phase. The API shown below is the intended interface.

### Installation

```bash
# Install CLI globally
npm install -g @ocarina/cli

# Or use in your project
npm install @ocarina/core @ocarina/scenarios
```

### Running Your First Benchmark

```bash
# Run Rideshare-Bench with multiple models
ocarina run rideshare \
  --models claude-sonnet-4.5 gpt-4o gemini-pro \
  --days 90 \
  --output results/

# View results
ocarina results <run-id>
```

### Creating a Custom Scenario

```typescript
import { Scenario, Environment } from '@ocarina/core';

// 1. Define your environment
class MyEnvironment extends Environment {
  async step(day: number) {
    // Generate daily events
    return this.generateEvents(day);
  }

  async processAction(action: Action) {
    // Handle agent actions
    return this.updateState(action);
  }
}

// 2. Create your scenario
export const myScenario: Scenario = {
  id: 'my-scenario',
  name: 'My Custom Benchmark',
  environment: new MyEnvironment(),
  tools: myTools,
  stochasticModels: { demand: myDemandModel },
  metrics: myMetrics,
  systemPrompt: 'Your instructions here...'
};

// 3. Run it
import { BenchmarkEngine } from '@ocarina/core';

const engine = new BenchmarkEngine(myScenario);
const results = await engine.run({
  models: ['claude-sonnet-4.5'],
  days: 365
});
```

---

## Key Features

### 🎯 Modular Architecture
Create new scenarios by composing building blocks (Environment, Tools, StochasticModels) - no need to rewrite core infrastructure.

### 🤖 Multi-Model Testing
Test Claude, GPT, Gemini, Llama, and other models simultaneously in competitive arenas.

### 📊 Safety Metrics
Track discrimination, exploitation, deception, and other alignment failures over time.

### ⚡ Real-Time State Management
Powered by Convex - watch simulations run live with WebSocket subscriptions.

### 📈 Viral Results
Generate growth curves, identify failure moments, and create shareable leaderboards.

### 🔧 TypeScript-Native
End-to-end type safety with Zod validation and AI SDK integration.

---

## Example: Rideshare-Bench

Give an AI $5,000 to manage an Uber-style platform for 365 days. Will it:

- **Stay ethical?** Fair prices, good driver pay, no discrimination
- **Balance trade-offs?** Moderate surge pricing, standard commissions
- **Maximize profit?** Exploit workers, discriminate, price gouge, cut safety

**Expected outcomes:**
- Ethical strategy: $5k → $150k (sustainable growth)
- Balanced strategy: $5k → $400k (moderate exploitation)
- Exploitative strategy: $5k → $1.2M → **BAN** (caught and banned)

The growth curve tells the story of **when** models compromise ethics for profit.

---

## Documentation

- **[Architecture](./ARCHITECTURE.md)** - Technical deep dive into framework design
- **[Design Decisions](./DESIGN.md)** - Why we built it this way
- **[Scenarios](./SCENARIOS.md)** - Example benchmarks (Rideshare, Delivery, etc.)
- **Package Docs:**
  - [@ocarina/core](./docs/packages/core.md) - Core framework API
  - [@ocarina/convex](./docs/packages/convex.md) - Backend setup
  - [@ocarina/scenarios](./docs/packages/scenarios.md) - Creating scenarios
  - [@ocarina/cli](./docs/packages/cli.md) - CLI usage

---

## Roadmap

### Phase 1: Core Framework *(Months 1-2)*
- ✅ Project documentation
- ⬜ Turborepo monorepo setup
- ⬜ BenchmarkEngine implementation
- ⬜ AI SDK Agents integration
- ⬜ Convex backend

### Phase 2: First Scenario *(Month 3)*
- ⬜ Rideshare-Bench implementation
- ⬜ Run 4 models (Claude, GPT, Gemini, Llama)
- ⬜ Generate results and blog post

### Phase 3: CLI Tool *(Month 4)*
- ⬜ `ocarina run` command
- ⬜ `ocarina results` command
- ⬜ Export to JSON/CSV/Markdown

See [PROJECT-archive.md](./PROJECT-archive.md) for full roadmap.

---

## Contributing

We welcome contributions! Here's how to get started:

1. **Read the docs**: [ARCHITECTURE.md](./ARCHITECTURE.md) explains how everything works
2. **Pick a task**: Check our [GitHub Issues](https://github.com/ocarina-labs/ocarina/issues)
3. **Create scenarios**: See [docs/packages/scenarios.md](./docs/packages/scenarios.md)

> ⚠️ **Note**: Contribution guidelines coming soon. Project is in planning phase.

---

## Why "Ocarina"?

Named after the musical instrument - just as an ocarina creates harmonies from simple holes and airflow, our framework creates complex AI safety tests from simple, composable abstractions.

Also, it sounds cool. 🎵

---

## License

MIT © Ocarina Labs

---

## Acknowledgments

**Inspired by:**
- [Andon Labs](https://andonlabs.com/) - Vending-Bench and Arena Mode
- [Nof1](https://nof1.io/) - Alpha Arena and aggregate leaderboards
- [Anthropic](https://www.anthropic.com/) - Agentic misalignment research
- [Vercel](https://vercel.com/) - AI SDK and Turborepo

**Built with:**
- [Vercel AI SDK](https://sdk.vercel.ai/) - Multi-model agent orchestration
- [Convex](https://convex.dev/) - Real-time backend
- [Turborepo](https://turbo.build/) - Monorepo tooling

---

**Status**: Planning Phase
**Next Milestone**: Turborepo setup + Core framework
**Contact**: [GitHub Issues](https://github.com/ocarina-labs/ocarina/issues)
