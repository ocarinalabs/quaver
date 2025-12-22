# Quaver Bench

AI agent benchmarks and evaluation tools.

## Packages

- `@quaver/vending-bench`: Vending machine business simulation benchmark
- `@quaver/core`: Shared infrastructure (AI gateway, database client)
- `@quaver/typescript-config`: TypeScript configurations

## Quick Start

```bash
# Install dependencies
bun install

# Run Vending-Bench
bun --env-file=packages/vending-bench/.env.local run packages/vending-bench/src/run.ts
```

## Development

```bash
# Lint and format
bun run fix

# Type check
bun run check-types
```
