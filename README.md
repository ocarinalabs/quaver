# Quaver

AI agent benchmarking platform. Create, run, and analyze benchmarks for evaluating AI agent capabilities in isolated sandbox environments.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Quaver Platform                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  apps/app   │    │ apps/shell  │    │  apps/www   │    │  apps/docs  │  │
│  │  Next.js    │    │ Web Term    │    │  Landing    │    │    Docs     │  │
│  └──────┬──────┘    └──────┬──────┘    └─────────────┘    └─────────────┘  │
│         │                  │                                                │
│         ▼                  ▼                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         packages/backend                             │   │
│  │                    Convex Serverless Backend                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   engine    │───▶│   agent     │───▶│   sandbox   │───▶│  snapshots  │  │
│  │ Orchestrate │    │ Claude SDK  │    │ Daytona SDK │    │ Dockerfiles │  │
│  └──────┬──────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │    core     │    │    bench    │    │     ui      │                     │
│  │  Framework  │◀───│  Template   │    │ Components  │                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Packages

### Core Infrastructure

| Package | Description |
|---------|-------------|
| [`@quaver/core`](packages/core) | Framework primitives - agent loop, tools, gateway, logging, SQLite persistence |
| [`@quaver/backend`](packages/backend) | Convex serverless backend - auth, projects, messages, payments |
| [`@quaver/sandbox`](packages/sandbox) | Daytona SDK wrapper - sandbox lifecycle, PTY, volumes, snapshots |
| [`@quaver/engine`](packages/engine) | Two-sandbox orchestration with shared volume data exchange |
| [`@quaver/agent`](packages/agent) | Claude Agent SDK wrapper for benchmark generation |
| [`@quaver/snapshots`](packages/snapshots) | Dockerfiles for pre-configured sandbox images |

### UI & Config

| Package | Description |
|---------|-------------|
| [`@quaver/ui`](packages/ui) | shadcn/ui components + 30 AI chat elements |
| [`@quaver/typescript-config`](packages/typescript-config) | Shared TypeScript configurations |

### Benchmark Templates

| Package | Description |
|---------|-------------|
| [`@quaver/bench`](packages/bench) | Base template - copy to create new benchmarks |
| [`@quaver/rideshare-bench`](packages/rideshare-bench) | Example: Rideshare driver simulation |
| [`@quaver/vending-bench`](packages/vending-bench) | Example: Vending machine business simulation |

## Apps

| App | Description |
|-----|-------------|
| [`apps/app`](apps/app) | Next.js web app - Clerk auth, Convex sync, AI chat interface |
| [`apps/shell`](apps/shell) | Web terminal - Bun PTY + xterm.js over WebSocket |
| [`apps/www`](apps/www) | Landing page |
| [`apps/docs`](apps/docs) | Documentation site |

## Quick Start

```bash
# Install dependencies
bun install

# Run the web app
bun run --cwd apps/app dev

# Run a benchmark
bun run --cwd packages/rideshare-bench dev
```

## Development

```bash
# Lint and format (all packages)
bun run fix

# Type check (all packages)
bun run check-types

# Build (all packages)
bun run build
```

## Environment Variables

Create `.env.local` files in the packages/apps that need them:

| Variable | Used By | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | apps/app | Convex deployment URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | apps/app | Clerk public key |
| `CLERK_SECRET_KEY` | apps/app, backend | Clerk secret key |
| `AI_GATEWAY_API_KEY` | core, app | Vercel AI Gateway token |
| `DAYTONA_API_KEY` | sandbox, backend | Daytona API key |
| `ANTHROPIC_API_KEY` | agent, engine | Anthropic API key |
| `TURSO_DATABASE_URL` | core | Turso SQLite URL |
| `TURSO_AUTH_TOKEN` | core | Turso auth token |

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Monorepo**: [Turborepo](https://turborepo.com)
- **Frontend**: [Next.js](https://nextjs.org), [React](https://react.dev), [Tailwind CSS](https://tailwindcss.com)
- **Backend**: [Convex](https://convex.dev)
- **Auth**: [Clerk](https://clerk.com)
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai), [Claude Agent SDK](https://github.com/anthropics/claude-code)
- **Sandboxing**: [Daytona](https://daytona.io)
- **Linting**: [Ultracite](https://github.com/haydenbleasel/ultracite) (Biome preset)

## License

Private - Internal use only
