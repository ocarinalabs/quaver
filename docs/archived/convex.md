# @ocarina/convex

> Convex backend for Ocarina benchmarks

This package contains the Convex backend that handles state storage, tool execution, metrics tracking, and real-time subscriptions.

---

## Setup

### 1. Install Dependencies

```bash
npm install convex
```

### 2. Initialize Convex

```bash
npx convex dev
```

This creates a `convex/` directory and connects to your Convex deployment.

### 3. Add Schema

Copy the schema from this package:

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  runs: defineTable({
    scenario: v.string(),
    models: v.array(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed')
    ),
    config: v.object({
      days: v.number(),
      seed: v.number(),
      startingCapital: v.number(),
    }),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }).index('by_scenario', ['scenario']),

  states: defineTable({
    runId: v.id('runs'),
    modelId: v.string(),
    day: v.number(),
    state: v.any(),
    timestamp: v.number(),
  })
    .index('by_run_model', ['runId', 'modelId', 'day'])
    .index('by_run_day', ['runId', 'day']),

  actions: defineTable({
    runId: v.id('runs'),
    modelId: v.string(),
    day: v.number(),
    toolName: v.string(),
    params: v.any(),
    result: v.any(),
    success: v.boolean(),
    timestamp: v.number(),
  })
    .index('by_run_model', ['runId', 'modelId'])
    .index('by_run_day', ['runId', 'day']),

  metrics: defineTable({
    runId: v.id('runs'),
    modelId: v.string(),
    day: v.number(),
    metrics: v.any(),
    timestamp: v.number(),
  })
    .index('by_run_model', ['runId', 'modelId'])
    .index('by_run_day', ['runId', 'day']),

  events: defineTable({
    runId: v.id('runs'),
    day: v.number(),
    type: v.string(),
    data: v.any(),
    timestamp: v.number(),
  })
    .index('by_run_day', ['runId', 'day'])
    .index('by_run_type', ['runId', 'type']),
});
```

---

## Mutations

### createRun

Create a new benchmark run.

```typescript
// convex/mutations.ts
import { mutation } from './_generated/server';
import { v } from 'convex/values';

export const createRun = mutation({
  args: {
    scenario: v.string(),
    models: v.array(v.string()),
    config: v.object({
      days: v.number(),
      seed: v.number(),
      startingCapital: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('runs', {
      scenario: args.scenario,
      models: args.models,
      config: args.config,
      status: 'pending',
    });
  },
});
```

**Usage:**
```typescript
const runId = await convex.mutation('createRun', {
  scenario: 'rideshare',
  models: ['claude-sonnet-4.5', 'gpt-4o'],
  config: {
    days: 90,
    seed: 12345,
    startingCapital: 5000,
  },
});
```

---

### saveState

Save state snapshot for a model on a specific day.

```typescript
export const saveState = mutation({
  args: {
    runId: v.id('runs'),
    modelId: v.string(),
    day: v.number(),
    state: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('states', {
      ...args,
      timestamp: Date.now(),
    });
  },
});
```

---

### logAction

Log a tool execution.

```typescript
export const logAction = mutation({
  args: {
    runId: v.id('runs'),
    modelId: v.string(),
    day: v.number(),
    toolName: v.string(),
    params: v.any(),
    result: v.any(),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('actions', {
      ...args,
      timestamp: Date.now(),
    });
  },
});
```

---

### recordMetrics

Record metrics for a day.

```typescript
export const recordMetrics = mutation({
  args: {
    runId: v.id('runs'),
    modelId: v.string(),
    day: v.number(),
    metrics: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('metrics', {
      ...args,
      timestamp: Date.now(),
    });
  },
});
```

---

## Queries

### getRun

Get run details.

```typescript
export const getRun = query({
  args: { runId: v.id('runs') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.runId);
  },
});
```

---

### getState

Get state for a model on a specific day.

```typescript
export const getState = query({
  args: {
    runId: v.id('runs'),
    modelId: v.string(),
    day: v.number(),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query('states')
      .withIndex('by_run_model', q =>
        q.eq('runId', args.runId)
         .eq('modelId', args.modelId)
         .eq('day', args.day)
      )
      .first();

    return state?.state;
  },
});
```

---

### getTimeline

Get full timeline of states for a model.

```typescript
export const getTimeline = query({
  args: {
    runId: v.id('runs'),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('states')
      .withIndex('by_run_model', q =>
        q.eq('runId', args.runId)
         .eq('modelId', args.modelId)
      )
      .collect();
  },
});
```

---

### getMetrics

Get all metrics for a model.

```typescript
export const getMetrics = query({
  args: {
    runId: v.id('runs'),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('metrics')
      .withIndex('by_run_model', q =>
        q.eq('runId', args.runId)
         .eq('modelId', args.modelId)
      )
      .collect();
  },
});
```

---

## Real-Time Subscriptions

### Subscribe to Run Progress

```typescript
import { ConvexClient } from 'convex/browser';

const convex = new ConvexClient(process.env.CONVEX_URL);

// Subscribe to state changes
const unsubscribe = convex.subscribe(
  'watchState',
  { runId },
  (state) => {
    console.log('State updated:', state);
  }
);

// Later: unsubscribe
unsubscribe();
```

### Watch Query

```typescript
export const watchState = query({
  args: { runId: v.id('runs') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('states')
      .withIndex('by_run', q => q.eq('runId', args.runId))
      .order('desc')
      .take(1);
  },
});
```

---

## Scenario-Specific Mutations

For complex scenarios, add custom mutations:

### Rideshare Example

```typescript
// convex/rideshare.ts
export const acceptRide = mutation({
  args: {
    runId: v.id('runs'),
    modelId: v.string(),
    rideId: v.string(),
    driverId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get current state
    const state = await getCurrentState(ctx, args.runId, args.modelId);

    // Update state
    const ride = state.rides.find(r => r.id === args.rideId);
    if (!ride) {
      throw new Error('Ride not found');
    }

    ride.status = 'accepted';
    ride.driverId = args.driverId;

    // Save updated state
    await ctx.db.insert('states', {
      runId: args.runId,
      modelId: args.modelId,
      day: state.day,
      state,
      timestamp: Date.now(),
    });

    return { success: true, ride };
  },
});
```

---

## Environment Variables

Create `.env.local`:

```bash
CONVEX_DEPLOYMENT=your-deployment-url
CONVEX_URL=https://your-deployment.convex.cloud
```

---

## Best Practices

### 1. Use Indexes

Always query with indexes for performance:

```typescript
// Good - uses index
await ctx.db
  .query('states')
  .withIndex('by_run_model', q => q.eq('runId', runId))
  .collect();

// Bad - full table scan
await ctx.db
  .query('states')
  .filter(q => q.eq(q.field('runId'), runId))
  .collect();
```

### 2. Batch Mutations

For multiple related mutations, use a single mutation:

```typescript
// Good - single mutation
export const processDayEnd = mutation({
  handler: async (ctx, args) => {
    await saveState(ctx, ...);
    await recordMetrics(ctx, ...);
    await logEvents(ctx, ...);
  },
});

// Bad - multiple round trips
await convex.mutation('saveState', ...);
await convex.mutation('recordMetrics', ...);
await convex.mutation('logEvents', ...);
```

### 3. Handle Errors

```typescript
export const safeMutation = mutation({
  handler: async (ctx, args) => {
    try {
      // Do work
      return { success: true };
    } catch (error) {
      console.error('Mutation failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
});
```

---

## Cost Optimization

### Free Tier Limits

- **Reads**: 1M/month
- **Writes**: 100k/month
- **Storage**: 1GB

### Typical Benchmark Costs

For a 365-day simulation with 4 models:

- States: 365 days × 4 models = 1,460 writes
- Actions: ~50 actions/day × 365 × 4 = 73,000 writes
- Metrics: 365 × 4 = 1,460 writes
- Total: **~76,000 writes** (within free tier!)

---

## Troubleshooting

### "Schema validation failed"

Make sure your state object matches Convex schema:

```typescript
// ❌ Bad - functions not serializable
state = {
  balance: 5000,
  calculateProfit: () => {...}
};

// ✅ Good - plain data
state = {
  balance: 5000,
  profit: 1000
};
```

### "Query too slow"

Add an index:

```typescript
.index('by_custom_field', ['runId', 'customField'])
```

### "Real-time not working"

Check Convex URL is set:

```typescript
const convex = new ConvexClient(process.env.CONVEX_URL);
```

---

## Next Steps

- Read [core.md](./core.md) for framework API
- See [ARCHITECTURE.md](../../ARCHITECTURE.md) for state management details
- Check [Convex docs](https://docs.convex.dev) for advanced features
