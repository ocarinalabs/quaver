# @quaver/snapshots

Daytona snapshot Dockerfiles for pre-configured agent and benchmark sandbox environments.

## Features

- **Agent Snapshot** - Claude Code CLI, TypeScript, Bun runtime for benchmark generation
- **Core Snapshot** - Lightweight Node + Bun runtime for benchmark execution
- **Fast Startup** - Pre-installed dependencies reduce sandbox creation from ~30s to ~3s
- **Consistent Environment** - Same packages every time, no install variability
- **Resource Optimized** - Right-sized CPU/memory/disk for each workload

## Snapshots

### Agent (`quaver-agent`)

Full development environment for running Claude Code CLI to generate benchmarks.

| Resource | Value | Rationale |
|----------|-------|-----------|
| vCPU | 2 | Claude Code CLI + TypeScript compilation |
| RAM | 4 GiB | Memory for agent execution |
| Disk | 8 GiB | npm packages, generated code |

**Pre-installed:**

| Package | Source | Purpose |
|---------|--------|---------|
| Node.js 22 | base image | Required by Claude Code CLI |
| Bun | curl script | Package manager + runtime |
| Claude Code CLI | bun global | Agent SDK runtime (`claude` command) |
| TypeScript | bun global | Type checking (`tsc`) |
| tsx | bun global | Run TypeScript directly |
| Ultracite | bun global | Linting/formatting |
| @quaver/core | git clone + build | Workflow patterns |
| @quaver/agent | git clone + build | Benchmark generation |
| Git, curl, wget | apt | Dev utilities |

### Core (`quaver-core`)

Lightweight environment for running benchmarks via @quaver/core API calls.

| Resource | Value | Rationale |
|----------|-------|-----------|
| vCPU | 1 | API calls only - LLM compute on Anthropic's servers |
| RAM | 1 GiB | Minimal memory for orchestration |
| Disk | 3 GiB | Runtime dependencies |

**Pre-installed tools:**

| Tool | Source | Purpose |
|------|--------|---------|
| Node.js 22 | base image | JavaScript runtime |
| Bun | curl script | Package manager + runtime |
| Git, curl, wget | apt | Dev utilities |

## Quick Start

```bash
cd packages/snapshots

# One-time setup: add GitHub token for private repo access
cp .env.example .env.local
# Edit .env.local and add your token from: gh auth token

# Deploy a snapshot (build + push + clean)
bun run deploy agent    # Deploy agent snapshot
bun run deploy core     # Deploy core snapshot
bun run deploy          # Deploy all snapshots
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `bun run build [name]` | Build Docker image locally |
| `bun run push [name]` | Push to Daytona registry |
| `bun run deploy [name]` | Build + push + clean (full cycle) |
| `bun run clean [name]` | Remove local Docker image |
| `bun run list` | Show Daytona snapshots |

If `[name]` is omitted, the command runs for all snapshots.

## Setup

### GitHub Token (Required for Private Repo)

The agent snapshot clones `@quaver/core` and `@quaver/agent` from GitHub during build. For private repos, you need a token:

```bash
# Get your existing token (doesn't create a new one)
gh auth token

# Add to .env.local
echo "GITHUB_TOKEN=$(gh auth token)" > .env.local
```

Bun automatically loads `.env.local` - no extra config needed.

## Manual Build (Advanced)

If you need to build manually (e.g., debugging):

```bash
cd packages/snapshots/agent

# Build for AMD64 with --load flag (required for Daytona on Apple Silicon)
docker build --platform=linux/amd64 --load --build-arg GITHUB_TOKEN=$(gh auth token) -t quaver-agent:v1 .

# Push to Daytona
daytona snapshot push quaver-agent:v1 --name quaver-agent --cpu 2 --memory 4 --disk 8
```

**Why `--load` is required:**
- Docker buildx stores images in its own cache, not the local Docker daemon
- `daytona snapshot push` uses `docker inspect` which only sees local daemon images
- `--load` exports the buildx image to the local Docker daemon

## Usage

Use snapshots when creating sandboxes via `@quaver/sandbox`:

```typescript
import { createClient } from "@quaver/sandbox/utils/client";
import { createSandbox } from "@quaver/sandbox/sandbox/lifecycle";

const client = createClient();

// Create sandbox from agent snapshot
const agentSandbox = await createSandbox(client, {
  snapshot: "quaver-agent",
  name: "my-agent",
});

// Create sandbox from core snapshot
const coreSandbox = await createSandbox(client, {
  snapshot: "quaver-core",
  name: "my-benchmark",
});
```

## Structure

```
packages/snapshots/
├── package.json
├── README.md
├── .env.example      # Template for GitHub token
├── .env.local        # Your token (gitignored)
├── src/
│   └── build.ts      # Build automation CLI
├── agent/
│   └── Dockerfile    # Claude Code CLI + @quaver packages
└── core/
    └── Dockerfile    # Lightweight benchmark runtime
```

## Dockerfile Details

### Agent Dockerfile

The agent snapshot includes pre-built `@quaver/core` and `@quaver/agent` packages:

```dockerfile
FROM node:22-slim

RUN apt-get update && apt-get install -y git curl wget ca-certificates unzip && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.com/install | bash
ENV PATH="/root/.bun/bin:$PATH"

RUN bun add -g @anthropic-ai/claude-code typescript tsx ultracite

WORKDIR /home/daytona

# Clone and build @quaver packages (GITHUB_TOKEN passed via --build-arg)
ARG GITHUB_TOKEN
RUN if [ -n "$GITHUB_TOKEN" ]; then \
      git clone --depth 1 https://${GITHUB_TOKEN}@github.com/ocarinalabs/quaver.git /tmp/quaver; \
    else \
      git clone --depth 1 https://github.com/ocarinalabs/quaver.git /tmp/quaver; \
    fi \
    && cd /tmp/quaver && bun install \
    && bun run --cwd packages/core build \
    && bun run --cwd packages/agent build \
    && mkdir -p /home/daytona/node_modules/@quaver \
    && cp -r packages/core /home/daytona/node_modules/@quaver/core \
    && cp -r packages/agent /home/daytona/node_modules/@quaver/agent \
    && rm -rf /tmp/quaver

# Default preview page
RUN echo '<!DOCTYPE html>...' > /home/daytona/index.html

CMD ["sleep", "infinity"]
```

### Core Dockerfile

```dockerfile
FROM node:22-slim

RUN apt-get update && apt-get install -y git curl wget ca-certificates unzip && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.com/install | bash

ENV PATH="/root/.bun/bin:$PATH"

WORKDIR /home/daytona

CMD ["sleep", "infinity"]
```

## Why Node + Bun?

- **Node.js is required** - Claude Code CLI explicitly requires Node.js (per Agent SDK docs)
- **Bun via curl** - Official installation method, not via npm
- **Bun for packages** - Faster package installation and execution

## Updating Snapshots

When `@quaver/core` or `@quaver/agent` changes:

```bash
cd packages/snapshots
bun run deploy agent
```

To update Dockerfile dependencies:

1. Modify the relevant `Dockerfile`
2. Run `bun run deploy <name>`

Existing sandboxes continue using the old snapshot until recreated.

## License

Private - Internal use only
