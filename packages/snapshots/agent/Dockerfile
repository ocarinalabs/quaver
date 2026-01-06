FROM node:22-slim

RUN apt-get update && apt-get install -y git curl wget ca-certificates unzip && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.com/install | bash

ENV PATH="/root/.bun/bin:$PATH"

RUN bun add -g @anthropic-ai/claude-code typescript tsx ultracite

WORKDIR /home/daytona

ARG GITHUB_TOKEN

RUN if [ -n "$GITHUB_TOKEN" ]; then \
      git clone --depth 1 https://${GITHUB_TOKEN}@github.com/ocarinalabs/quaver.git /tmp/quaver; \
    else \
      git clone --depth 1 https://github.com/ocarinalabs/quaver.git /tmp/quaver; \
    fi \
    && cd /tmp/quaver \
    && bun install \
    && bun run --cwd packages/core build \
    && bun run --cwd packages/bench build \
    && bun run --cwd packages/agent build \
    # Install @quaver/core as framework (dist only)
    && mkdir -p /home/daytona/node_modules/@quaver/core \
    && cp -r /tmp/quaver/packages/core/dist /home/daytona/node_modules/@quaver/core/dist \
    && cp /tmp/quaver/packages/core/package.json /home/daytona/node_modules/@quaver/core/ \
    # Install @quaver/bench as editable source (for copying)
    && mkdir -p /home/daytona/bench \
    && cp -r /tmp/quaver/packages/bench/src /home/daytona/bench/src \
    && cp /tmp/quaver/packages/bench/package.json /home/daytona/bench/ \
    && cp /tmp/quaver/packages/bench/tsconfig.json /home/daytona/bench/ \
    && cp /tmp/quaver/packages/bench/README.md /home/daytona/bench/ \
    # Create benchmarks workspace
    && mkdir -p /home/daytona/benchmarks \
    # Install @quaver/agent CLI (dist only)
    && mkdir -p /home/daytona/node_modules/@quaver/agent \
    && cp -r /tmp/quaver/packages/agent/dist /home/daytona/node_modules/@quaver/agent/dist \
    && cp /tmp/quaver/packages/agent/package.json /home/daytona/node_modules/@quaver/agent/ \
    # Install dependencies
    && cd /home/daytona && bun add @anthropic-ai/claude-agent-sdk \
    && ln -s /home/daytona/node_modules/@quaver/agent/dist/cli.js /usr/local/bin/quaver \
    && chmod +x /home/daytona/node_modules/@quaver/agent/dist/cli.js \
    # Install shell server
    && mkdir -p /home/daytona/shell \
    && cp /tmp/quaver/apps/shell/server.ts /home/daytona/shell/ \
    && rm -rf /tmp/quaver

# Copy Claude Code credentials (pre-authenticated)
RUN mkdir -p /root/.claude
COPY .credentials.json /root/.claude/.credentials.json

WORKDIR /home/daytona

ENTRYPOINT ["bun", "/home/daytona/shell/server.ts"]
