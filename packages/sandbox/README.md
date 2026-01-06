# @quaver/sandbox

Thin wrapper around the Daytona SDK for managing secure, isolated execution environments for AI agents and benchmarks.

## Features

- **Sandbox Lifecycle** - Create, start, stop, archive, recover, and delete sandboxes
- **Volume Management** - Persistent storage with subpath mounting for data sharing
- **Snapshot Support** - Create pre-configured sandbox images for faster creation
- **PTY Support** - Interactive terminal sessions and agent execution
- **Multi-language** - TypeScript, Python, and other language runtimes
- **Functional Design** - Pure async functions, no classes or stateful abstractions

## Installation

```bash
bun add @quaver/sandbox
```

## Quick Start

```typescript
import { createClient } from "@quaver/sandbox/client";
import { createSandbox, deleteSandbox } from "@quaver/sandbox/sandbox";

// Create client (reads DAYTONA_API_KEY from env)
const client = createClient();

// Create sandbox
const sandbox = await createSandbox(client, {
  language: "typescript",
  name: "my-sandbox",
  autoStopInterval: 30,
});

// Execute code
const response = await sandbox.process.codeRun(`
  console.log("Hello from sandbox!");
`);

console.log(response.result); // "Hello from sandbox!"

// Cleanup
await deleteSandbox(sandbox);
```

## Modules

### Client (`@quaver/sandbox/client`)

Factory function for creating Daytona clients:

```typescript
import { createClient } from "@quaver/sandbox/client";

// Default: reads from environment variables
const client = createClient();

// Custom configuration
const client = createClient({
  apiKey: "your-api-key",
  apiUrl: "https://api.daytona.io",
  target: "us",
});
```

### Sandbox (`@quaver/sandbox/sandbox`)

| Function | Description |
|----------|-------------|
| `createSandbox(client, params)` | Create new sandbox from image or snapshot |
| `findSandbox(client, idOrName)` | Find sandbox by ID or name (searches) |
| `getSandbox(client, idOrName)` | Get sandbox by ID (direct lookup) |
| `stopSandbox(sandbox)` | Stop sandbox (pause execution) |
| `startSandbox(sandbox)` | Start sandbox (resume execution) |
| `archiveSandbox(sandbox)` | Archive to cold storage |
| `recoverSandbox(sandbox)` | Recover from error state |
| `deleteSandbox(sandbox)` | Delete sandbox permanently |

```typescript
import {
  createSandbox,
  stopSandbox,
  startSandbox,
  deleteSandbox,
} from "@quaver/sandbox/sandbox";

// Create with language image
const sandbox = await createSandbox(client, {
  language: "typescript",
  name: "agent-sandbox",
  autoStopInterval: 30,
});

// Create from snapshot
const sandbox = await createSandbox(client, {
  snapshot: "my-preconfigured-snapshot",
  name: "fast-sandbox",
});

// Lifecycle operations
await stopSandbox(sandbox);
await startSandbox(sandbox);
await deleteSandbox(sandbox);
```

### PTY (`@quaver/sandbox/sandbox/pty`)

Interactive terminal sessions for running commands and agents:

```typescript
import { createPty, runAgentViaPty, runCommandViaPty } from "@quaver/sandbox/sandbox/pty";

// Run agent via PTY (Claude CLI)
const result = await runAgentViaPty(
  sandbox,
  "Generate a benchmark for API rate limiting",
  process.env.ANTHROPIC_API_KEY,
  (data) => console.log("Agent:", data) // Optional streaming callback
);

// Run arbitrary command via PTY
await runCommandViaPty(
  sandbox,
  "npm install && npm test",
  (data) => console.log("Output:", data)
);

// Create raw PTY session
const pty = await createPty(sandbox, {
  cols: 80,
  rows: 24,
});
```

### Snapshot (`@quaver/sandbox/snapshot`)

Create pre-configured sandbox images for faster creation:

```typescript
import { createSnapshot } from "@quaver/sandbox/snapshot";

const snapshot = await createSnapshot(
  client,
  {
    sandboxId: sandbox.id,
    name: "my-snapshot",
  },
  {
    onLogs: (log) => console.log("Snapshot:", log),
  }
);
```

### Volume (`@quaver/sandbox/volume`)

Persistent storage that can be shared across sandboxes:

```typescript
import { getVolume, deleteVolume } from "@quaver/sandbox/volume";

// Get or create volume
const volume = await getVolume(client, "shared-data", true);

// Mount in sandbox with subpaths
const sandbox = await createSandbox(client, {
  language: "typescript",
  name: "sandbox-with-volume",
  volumes: [
    { volumeId: volume.id, mountPath: "/data", subpath: "sandbox-1" },
  ],
});

// Cleanup
await deleteVolume(client, volume);
```

### Low-level API (`@quaver/sandbox/api`)

Direct HTTP API access when SDK doesn't suffice:

```typescript
import { createDaytonaApi } from "@quaver/sandbox/api";

const api = createDaytonaApi(process.env.DAYTONA_API_KEY);

// Direct CRUD operations
const sandbox = await api.create({ language: "typescript" });
await api.start(sandbox.id);
await api.stop(sandbox.id);
await api.delete(sandbox.id);

// Execute commands
const result = await api.executeCommand(sandbox.id, "ls -la");

// Wait for state changes
await api.waitForState(sandbox.id, "running", 60000);
```

## SDK Direct Access

Once a sandbox is created, use SDK methods directly:

```typescript
// Code execution
const result = await sandbox.process.codeRun(`
  const fs = require('fs');
  fs.writeFileSync('/output/data.json', JSON.stringify({ value: 42 }));
  console.log('Done');
`);
console.log(result.result);    // "Done"
console.log(result.exitCode);  // 0

// File operations
await sandbox.fs.uploadFile("/input/config.json", Buffer.from("{}"));
const content = await sandbox.fs.downloadFile("/output/data.json");
const data = JSON.parse(content.toString());

// Environment variables
await sandbox.env.set("API_KEY", "secret");
const key = await sandbox.env.get("API_KEY");
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DAYTONA_API_KEY` | Yes | Authentication token |
| `DAYTONA_API_URL` | No | Custom API endpoint |
| `DAYTONA_TARGET` | No | Region: `us` or `eu` |

### Sandbox Creation Options

| Option | Type | Description |
|--------|------|-------------|
| `language` | string | Runtime: `typescript`, `python`, etc. |
| `name` | string | Unique sandbox identifier |
| `snapshot` | string | Create from existing snapshot |
| `autoStopInterval` | number | Auto-stop after N seconds inactive |
| `volumes` | array | Volume mounts with subpaths |
| `resources` | object | CPU/memory limits |

## Exports

| Import Path | Description |
|-------------|-------------|
| `@quaver/sandbox/client` | Client factory |
| `@quaver/sandbox/sandbox` | Sandbox lifecycle operations |
| `@quaver/sandbox/sandbox/pty` | PTY/terminal operations |
| `@quaver/sandbox/snapshot` | Snapshot operations |
| `@quaver/sandbox/volume` | Volume operations |
| `@quaver/sandbox/api` | Low-level HTTP API |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      @quaver/sandbox                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Client    │    │  Lifecycle  │    │   Volume    │         │
│  │   Factory   │───▶│  Functions  │───▶│  Storage    │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                  │                 │
│         │           ┌─────────────┐          │                 │
│         │           │     PTY     │          │                 │
│         │           │  Terminal   │          │                 │
│         │           └─────────────┘          │                 │
│         ▼                  ▼                  ▼                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │                  Daytona SDK                         │       │
│  │    sandbox.process | sandbox.fs | sandbox.git       │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
