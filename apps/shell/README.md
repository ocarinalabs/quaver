# @quaver/shell

Web terminal for accessing Daytona sandbox environments via browser, powered by Bun's native PTY and WebSocket support.

## Features

- **Native PTY** - Uses Bun.Terminal for real shell sessions (Bun 1.3.5+)
- **WebSocket Streaming** - Real-time bidirectional I/O via Bun.serve()
- **Zero Build Step** - xterm.js loaded via CDN, no bundler required
- **Lightweight** - ~100 lines of code, no dependencies beyond Bun

## Usage

```bash
# Development (with hot reload)
bun run dev

# Production
bun run start
```

Open http://localhost:3000 in your browser.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        @quaver/shell                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Browser    │◀──▶│  WebSocket  │◀──▶│ Bun.Terminal│         │
│  │  xterm.js   │    │  Bun.serve  │    │    PTY      │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│        │                  │                  │                 │
│        ▼                  ▼                  ▼                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Terminal   │    │    HTTP     │    │  /bin/bash  │         │
│  │  Rendering  │    │   Server    │    │   Process   │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Server (`server.ts`)

Single file server handling:

| Endpoint | Description |
|----------|-------------|
| `GET /` | Serves HTML with embedded xterm.js |
| `WS /ws` | WebSocket for terminal I/O |

### Terminal Sessions

Each WebSocket connection spawns a new PTY session:

- **Bun.Terminal** - Native PTY with configurable cols/rows
- **Bun.spawn** - Spawns `/bin/bash` attached to the terminal
- **WeakMap sessions** - Automatic cleanup on disconnect

## Client (Embedded HTML)

xterm.js loaded from CDN with addons:

| Addon | Version | Purpose |
|-------|---------|---------|
| `@xterm/xterm` | 5.5.0 | Core terminal emulator |
| `@xterm/addon-fit` | 0.10.0 | Auto-resize to container |
| `@xterm/addon-attach` | 0.11.0 | WebSocket attachment |

## Integration

### Daytona Sandbox

When deployed in a Daytona sandbox, the shell is accessible via the preview URL:

```
https://3000-{sandboxId}.proxy.daytona.work
```

Users can run commands like:

```bash
quaver-agent "Create a benchmark for ..."
```

### Dockerfile

The shell is included in the `quaver-agent` snapshot:

```dockerfile
FROM node:22-slim
# ... install Bun, @quaver/agent, @quaver/core ...
COPY apps/shell /home/daytona/shell
WORKDIR /home/daytona/shell
CMD ["bun", "server.ts"]
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| Port | 3000 | HTTP/WebSocket server port |
| Cols | 120 | Terminal columns |
| Rows | 30 | Terminal rows |
| Shell | /bin/bash | Shell executable |

## Development

```bash
# Run with hot reload
bun --hot server.ts

# Type check
bun run check-types

# Lint
npx ultracite check
```

## License

Private - Internal use only
