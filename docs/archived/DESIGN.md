# Design Decisions

> Why Ocarina is built the way it is

This document explains the philosophy and key design decisions behind Ocarina's architecture. It focuses on **why** rather than **how** (see [ARCHITECTURE.md](./ARCHITECTURE.md) for implementation details).

---

## Table of Contents

1. [Framework Philosophy](#framework-philosophy)
2. [Key Design Decisions](#key-design-decisions)
3. [Trade-offs Analysis](#trade-offs-analysis)
4. [Safety-First Principles](#safety-first-principles)
5. [Alternative Approaches](#alternative-approaches)

---

## Framework Philosophy

### Core Principles

**1. Composability Over Configuration**

Scenarios are built by composing small, reusable components (Environment, Tools, StochasticModels) rather than configuring a monolithic system.

```typescript
// Good: Composable
const myScenario = {
  environment: new CustomEnvironment(),
  tools: { ...baseTools, ...customTools },
  stochasticModels: { demand: myDemandModel }
};

// Bad: Configuration-heavy
const myScenario = {
  config: {
    environmentType: 'custom',
    baseToolsEnabled: true,
    customToolsConfig: {...},
    demandModelType: 'custom',
    // 50 more config options...
  }
};
```

**2. TypeScript-First**

Everything is TypeScript, from core engine to scenario definitions. No Python, no YAML configs, no runtime surprises.

**Rationale:**
- Compile-time type checking catches errors early
- AI SDK (Vercel) and Convex are TypeScript-native
- Single language reduces complexity
- Better IDE support (autocomplete, refactoring)

**3. Fail-Safe Defaults**

The framework is designed to fail loudly and early rather than silently continuing with corrupt state.

```typescript
// Validate state after every day
const validation = environment.validateState();
if (!validation.valid) {
  throw new Error(`State corruption detected: ${validation.errors}`);
}
```

**4. Observable Everything**

Every action, state change, and metric is logged to Convex for later analysis and debugging.

---

## Key Design Decisions

### 1. CLI-First, Web Later

**Decision:** Build framework as CLI/SDK, add web UI in Phase 6 (months 7-8)

**Rationale:**
- Core value proposition is benchmark execution, not UI
- Many power users will integrate programmatically (npm package)
- Web UI adds complexity without validating core assumptions
- Can always add later once we have real results to visualize
- Faster iteration during early development

**Usage Pattern:**
```bash
# Primary interface (CLI)
ocarina run rideshare --models claude-sonnet-4.5 gpt-4o

# View results in Convex dashboard initially
# Add web UI once we have real results
```

**Trade-offs:**
- ✅ Faster development (no UI work)
- ✅ More flexible for programmatic use
- ❌ Less accessible to non-technical users
- ❌ Results harder to share (no URLs yet)

---

### 2. Modular Architecture

**Decision:** Scenario as composable abstraction, not hardcoded implementation

**Rationale:**
- Want community to create scenarios without forking
- Avoid rewriting core engine for each new benchmark
- Enable visual scenario builder in future (Phase 7)
- Proven pattern from frameworks like Jest, Webpack

**Pattern:**
```typescript
// Easy to create new scenarios
const insuranceScenario: Scenario = {
  id: 'insurance',
  environment: new InsuranceEnvironment(),
  tools: insuranceTools,
  stochasticModels: { claims: claimModel },
};

// Framework handles execution (don't rewrite this!)
const engine = new BenchmarkEngine(insuranceScenario);
await engine.run();
```

**Trade-offs:**
- ✅ Extensible - new scenarios without touching core
- ✅ Reusable - share environments/tools across scenarios
- ✅ Testable - mock components easily
- ❌ More complex initial implementation
- ❌ Learning curve for scenario creators

**Alternative Considered:** Hardcode Rideshare-Bench, ship fast, refactor later
**Rejected Because:** Would delay community contributions and make it harder to validate "framework" claim

---

### 3. TypeScript Everywhere

**Decision:** No Python, pure TypeScript stack (core, backend, scenarios, CLI)

**Rationale:**
- **AI SDK (Vercel)** is TypeScript-native with first-class support
- **Convex** is TypeScript-native (no ORM needed)
- **Simpler onboarding** - contributors only need one language
- **Better type safety** - compile-time checks across entire stack
- **Tooling** - amazing IDE support (autocomplete, refactoring, jump-to-definition)

**Trade-offs:**
- ✅ Single language = less context switching
- ✅ Type safety across boundaries
- ✅ AI SDK / Convex integration is seamless
- ❌ Smaller AI/ML ecosystem than Python
- ❌ Fewer data science libraries
- ❌ May limit academic adoption (researchers prefer Python)

**Alternative Considered:** Python for scenarios + TypeScript for framework
**Rejected Because:**
- Type safety breaks at boundary
- Two build systems, two package managers
- More complex development environment
- AI SDK doesn't support Python well

---

### 4. Convex Over Traditional Database

**Decision:** Use Convex instead of Postgres + Prisma

**Rationale:**

**Why Convex:**
- ✅ **Real-time subscriptions** built-in (watch benchmarks live via WebSocket)
- ✅ **TypeScript-native** - no ORM, just TypeScript functions
- ✅ **Serverless** - no database to manage, scales automatically
- ✅ **Functions = Tools** - perfect match for our tool execution model
- ✅ **Reactivity** - UI updates automatically when state changes

**Why NOT Postgres:**
- Requires ORM (Prisma) - extra complexity
- No real-time subscriptions (need GraphQL subscriptions or polling)
- Needs hosting (RDS, Supabase, etc.)
- Schema migrations more complex

**Trade-offs:**
- ✅ Simpler architecture (no ORM, no migrations)
- ✅ Real-time capabilities out of the box
- ✅ Serverless (no infrastructure)
- ❌ Vendor lock-in to Convex
- ❌ Less mature ecosystem than Postgres
- ❌ Query flexibility (Convex queries less powerful than SQL)

**Migration Strategy:** If we outgrow Convex:
1. State is just JSON - easy to export
2. Can replay from action log
3. Switch backend is ~1 package change

---

### 5. Money as Primary Metric

**Decision:** Bank balance is the main success metric (not safety scores)

**Rationale:**
- **Quantifiable** - easy to compare across models ($150k vs $400k)
- **Creates pressure** - models must balance profit vs ethics
- **Matches Vending-Bench** - proven to be viral (growth curves!)
- **Universally understood** - non-technical audience gets it
- **Single objective** - avoids complex multi-objective optimization

**The Formula:**
```
Higher profit ceiling = More temptation = Better safety test

Vending-Bench: $500 → $5,478 (11x)
Rideshare-Bench: $5k → $1.2M (240x!)
```

**Trade-offs:**
- ✅ Simple, clear metric
- ✅ Creates ethical pressure
- ✅ Proven viral potential
- ❌ Might incentivize profit over safety exploration
- ❌ Not all scenarios fit "money" metric

**Mitigation:** Track safety metrics alongside (discrimination_score, etc.) but use balance for leaderboards.

---

### 6. Arena Mode Over Single-Agent

**Decision:** Multi-agent competition, not isolated testing

**Rationale:**
- **Emergent behaviors** - models interact (poaching drivers, price wars, alliances)
- **More realistic** - real platforms compete, don't exist in isolation
- **Better stories** - drama creates viral moments ("Gemini poached Claude's drivers!")
- **Matches success** - Vending-Bench Arena Mode was highly engaging

**Expected Emergent Behaviors:**
- Price wars (race to bottom on surge pricing)
- Driver poaching (bidding wars for talent)
- Cartels (models form alliances to fix prices)
- Sabotage (spam fake ride requests)

**Trade-offs:**
- ✅ More engaging for audience
- ✅ Tests cooperation/competition
- ✅ More realistic scenario
- ❌ Harder to reproduce (non-deterministic interactions)
- ❌ More complex state management
- ❌ Longer runtime (coordination overhead)

**Alternative Considered:** Isolated testing only
**Rejected Because:** Less interesting, less realistic, less viral

---

### 7. Turborepo, NOT Next Forge

**Decision:** Minimal Turborepo monorepo, skip Next Forge template

**Rationale:**

**What is Next Forge?**
- Opinionated Next.js SaaS template
- Includes: Auth, payments, billing, email, admin, blog, marketing site
- 90% of features irrelevant for a framework/SDK

**Why Turborepo:**
- ✅ Minimal, focused on build orchestration
- ✅ Perfect for multi-package monorepo
- ✅ No opinions about application structure
- ✅ Caching, parallelization built-in

**Why NOT Next Forge:**
- ❌ We're building a framework, not a SaaS
- ❌ No auth needed (CLI tool, not multi-user app)
- ❌ No billing needed (open source)
- ❌ No marketing site needed (GitHub README)
- ❌ 90% of code would be deleted

**Trade-offs:**
- ✅ Minimal, focused setup
- ✅ No unnecessary dependencies
- ✅ Easier to understand for contributors
- ❌ Need to set up Turborepo from scratch
- ❌ Miss out on Next Forge best practices

**When we might use Next Forge:** Phase 6 (Web UI) - if we build a SaaS platform for hosting benchmarks.

---

## Trade-offs Analysis

### Convex vs Traditional DB (Deep Dive)

| Aspect | Convex | Postgres + Prisma | Decision |
|--------|--------|------------------|----------|
| **Type Safety** | Native TypeScript | ORM (extra layer) | ✅ Convex |
| **Real-time** | Built-in WebSockets | Needs extra setup | ✅ Convex |
| **Query Power** | Limited (no joins) | Full SQL | ❌ Convex |
| **Maturity** | Young (2022) | Decades old | ❌ Convex |
| **Hosting** | Managed | Self-host or RDS | ✅ Convex |
| **Cost (small)** | Free tier generous | Free tier generous | Tie |
| **Cost (scale)** | Unknown | Predictable | ❌ Convex |
| **Vendor Lock-in** | High | Low | ❌ Convex |

**Overall:** Convex wins for early development, but we accept the lock-in risk.

**Mitigation:**
- Keep state as simple JSON (easy to export)
- Don't use Convex-specific features heavily
- Can migrate to Postgres in Phase 8 if needed

---

### TypeScript vs Python (Deep Dive)

| Aspect | TypeScript | Python | Decision |
|--------|-----------|--------|----------|
| **AI SDK Support** | First-class | Limited | ✅ TS |
| **Type Safety** | Compile-time | Runtime (mypy) | ✅ TS |
| **Ecosystem (AI)** | Growing | Dominant | ❌ TS |
| **Ecosystem (Web)** | Dominant | Growing | ✅ TS |
| **Learning Curve** | Moderate | Easy | ❌ TS |
| **Academic Adoption** | Low | High | ❌ TS |
| **Tooling** | Excellent | Good | ✅ TS |

**Overall:** TypeScript wins for our stack (Convex + AI SDK), but we lose ML ecosystem.

**Mitigation:**
- Can always add Python bindings later
- Most AI work is via API calls (language-agnostic)
- TypeScript AI ecosystem growing fast

---

## Safety-First Principles

### 1. Transparency by Default

All actions, state changes, and metrics are logged. No "black box" behavior.

```typescript
// Every tool execution is logged
await convex.mutation('logAction', {
  runId,
  modelId,
  day,
  toolName,
  params,
  result,
});
```

### 2. Ethical Pressure, Not Tricks

Scenarios should create genuine ethical dilemmas, not trick questions.

**Good:** "Surge 8x during wildfire = max profit BUT morally wrong"
**Bad:** "Hidden 'nuclear_launch' tool that ends simulation"

### 3. Reproducibility

All randomness is seeded. Same seed = same results.

```typescript
// Every stochastic model is seeded
const demandModel = new RideDemandModel(seed);
```

### 4. Fail-Safe Design

Prefer explicit errors over silent failures.

```typescript
// Bad: Silently continue with corrupted state
if (state.balance < 0) state.balance = 0;

// Good: Fail loudly
if (state.balance < 0) {
  throw new Error('State corruption: negative balance');
}
```

---

## Alternative Approaches

### What We Considered and Rejected

#### 1. Web App First

**Approach:** Build a Next.js app where users run benchmarks in browser
**Rejected Because:**
- Adds UI complexity before validating core
- Token costs too high for free tier
- Browser limitations (can't run 365-day sim)
- CLI is more flexible for power users

**Might revisit:** Phase 6 (Web UI) for results visualization

---

#### 2. Python + FastAPI

**Approach:** Core in Python, web API via FastAPI
**Rejected Because:**
- AI SDK (Vercel) is TypeScript-first
- Convex is TypeScript-native
- Adds language boundary complexity
- Harder to share types across stack

**Might revisit:** Never (unless AI SDK adds Python support)

---

#### 3. Configuration-Based Scenarios

**Approach:** Define scenarios in YAML/JSON config files
**Rejected Because:**
- Less flexible than code (can't define custom logic)
- No type safety
- Harder to debug
- Config files get complex fast

**Example:**
```yaml
# This gets unwieldy fast
scenario:
  id: rideshare
  tools:
    - name: accept_ride
      params:
        - name: rideId
          type: string
        - name: driverId
          type: string
      execute:
        - if: state.balance > 100
          then: accept
          else: reject
      # 50 more lines...
```

**Might revisit:** Phase 7 (Visual Builder) - but output TypeScript, not YAML

---

#### 4. Shared State (Not Isolated)

**Approach:** All models share same environment (like real competition)
**Rejected Because:**
- Hard to compare "ethical Claude" vs "exploitative GPT" when they interfere
- Coordination bugs harder to debug
- Can't reproduce individual model behavior

**Compromise:** Arena Mode (opt-in shared state) vs Solo Mode (isolated)

---

#### 5. Real Money (Like Nof1)

**Approach:** Use real crypto for rideshare payments
**Rejected Because:**
- Legal complexity (running unlicensed rideshare?)
- Safety risk (models could lose real money)
- Limits experimentation (expensive)
- Not necessary to prove alignment

**Might revisit:** Never (simulated money is safer and cheaper)

---

## Open Questions

Design decisions still under consideration:

### 1. Scenario Complexity

**Question:** Start simple (10 tools) or comprehensive (30 tools)?

**Options:**
- **Simple:** Faster to build, easier to debug, clearer results
- **Comprehensive:** More realistic, better coverage, harder to "game"

**Leaning toward:** Start simple, add complexity in Phase 2-5

---

### 2. Model Budget

**Question:** How much to spend per run? ($50? $200?)

**Considerations:**
- 365 days × 50 actions/day × 50 tokens/action = ~900k tokens
- Claude Sonnet: ~$3/M tokens = $2.70/run
- GPT-4o: ~$2.50/M tokens = $2.25/run
- 4 models = ~$10/run

**Leaning toward:** $50 budget (5 full runs for testing)

---

### 3. Duration

**Question:** 365 days = thorough but expensive. Start with 90 days?

**Options:**
- **90 days:** Faster, cheaper, still shows trends
- **365 days:** More data, better for long-horizon testing

**Leaning toward:** 90 days for development, 365 days for final results

---

### 4. Parallel vs Sequential

**Question:** Run models in parallel or one at a time?

**Options:**
- **Parallel:** Faster (4x speedup), but higher API rate limits risk
- **Sequential:** Slower, but safer and easier to debug

**Leaning toward:** Parallel with rate limiting

---

## Conclusion

Ocarina's design prioritizes:

1. **Modularity** over monolithic implementation
2. **Type safety** over runtime flexibility
3. **Composability** over configuration
4. **Transparency** over performance
5. **Safety** over features

These decisions may evolve as we learn, but they form our current foundation.

---

**See Also:**
- [ARCHITECTURE.md](./ARCHITECTURE.md) - How it's implemented
- [SCENARIOS.md](./SCENARIOS.md) - Example benchmarks
- [PROJECT-archive.md](./PROJECT-archive.md) - Original vision document
