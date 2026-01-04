# @quaver/sandbox

Thin wrapper around the Daytona SDK for managing secure, isolated execution environments for AI agents and benchmarks.

## Features

- **Sandbox Lifecycle** - Create, start, stop, archive, recover, and delete sandboxes
- **Volume Management** - Persistent storage with subpath mounting for data sharing
- **Snapshot Support** - Create pre-configured sandbox images for faster creation
- **Multi-language** - TypeScript, Python, and other language runtimes
- **Functional Design** - Pure async functions, no classes or stateful abstractions

## Installation

```bash
bun add @quaver/sandbox
```

## Quick Start

```typescript
import { createClient } from "@quaver/sandbox/utils/client";
import { createSandbox, deleteSandbox } from "@quaver/sandbox/sandbox/lifecycle";

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
│         ▼                  ▼                  ▼                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │                  Daytona SDK                         │       │
│  │    sandbox.process | sandbox.fs | sandbox.git       │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Modules

### Client (`@quaver/sandbox/utils/client`)

Factory function for creating Daytona clients:

```typescript
import { createClient } from "@quaver/sandbox/utils/client";

// Default: reads from environment variables
const client = createClient();

// Custom configuration
const client = createClient({
  apiKey: "your-api-key",
  apiUrl: "https://api.daytona.io",
  target: "us",
});
```

### Sandbox Lifecycle (`@quaver/sandbox/sandbox/lifecycle`)

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
} from "@quaver/sandbox/sandbox/lifecycle";

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

### Snapshot Lifecycle (`@quaver/sandbox/snapshot/lifecycle`)

Create pre-configured sandbox images for faster creation:

```typescript
import { createSnapshot } from "@quaver/sandbox/snapshot/lifecycle";

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

### Volume Lifecycle (`@quaver/sandbox/volume/lifecycle`)

Persistent storage that can be shared across sandboxes:

```typescript
import { getVolume, deleteVolume } from "@quaver/sandbox/volume/lifecycle";

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

## Usage Patterns

### Agent + Benchmark Isolation

```typescript
import { createClient } from "@quaver/sandbox/utils/client";
import { createSandbox, deleteSandbox } from "@quaver/sandbox/sandbox/lifecycle";
import { getVolume, deleteVolume } from "@quaver/sandbox/volume/lifecycle";

const client = createClient();

// Shared volume for data exchange
const volume = await getVolume(client, `run-${Date.now()}`, true);

// Agent sandbox writes to /output
const agentSandbox = await createSandbox(client, {
  language: "typescript",
  name: "agent",
  volumes: [
    { volumeId: volume.id, mountPath: "/output", subpath: "agent" },
  ],
});

await agentSandbox.process.codeRun(`
  fs.writeFileSync('/output/spec.json', JSON.stringify({ task: 'test' }));
`);
await agentSandbox.stop();

// Benchmark sandbox reads from /input (same volume subpath)
const benchmarkSandbox = await createSandbox(client, {
  language: "typescript",
  name: "benchmark",
  volumes: [
    { volumeId: volume.id, mountPath: "/input", subpath: "agent" },
    { volumeId: volume.id, mountPath: "/output", subpath: "benchmark" },
  ],
});

const spec = await benchmarkSandbox.fs.downloadFile("/input/spec.json");

// Cleanup
await deleteSandbox(agentSandbox);
await deleteSandbox(benchmarkSandbox);
await deleteVolume(client, volume);
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
| `@quaver/sandbox/utils/client` | Client factory |
| `@quaver/sandbox/sandbox/lifecycle` | Sandbox operations |
| `@quaver/sandbox/snapshot/lifecycle` | Snapshot operations |
| `@quaver/sandbox/volume/lifecycle` | Volume operations |

## SDK Types

Types are re-exported from `@daytonaio/sdk`:

| Type | Description |
|------|-------------|
| `Daytona` | Client for all operations |
| `Sandbox` | Sandbox instance with `.process`, `.fs`, `.git` |
| `DaytonaConfig` | Configuration options |
| `CreateSandboxFromImageParams` | Create from language image |
| `CreateSandboxFromSnapshotParams` | Create from snapshot |
| `Volume` | Volume for persistent storage |

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
