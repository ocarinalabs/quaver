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
    && bun run --cwd packages/agent build \
    && mkdir -p /home/daytona/node_modules/@quaver \
    && cp -r packages/core /home/daytona/node_modules/@quaver/core \
    && cp -r packages/agent /home/daytona/node_modules/@quaver/agent \
    && mkdir -p /home/daytona/shell \
    && cp -r apps/shell/* /home/daytona/shell/ \
    && rm -rf /tmp/quaver

WORKDIR /home/daytona/shell

CMD ["bun", "server.ts"]
