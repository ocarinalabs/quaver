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
    && rm -rf /tmp/quaver

RUN echo '<!DOCTYPE html><html><head><title>Sandbox Ready</title><style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#0a0a0a;color:#fff}div{text-align:center}h1{font-size:2rem;margin-bottom:0.5rem}p{color:#888}</style></head><body><div><h1>Sandbox Ready</h1><p>@quaver/agent is available</p></div></body></html>' > /home/daytona/index.html

CMD ["sh", "-c", "bunx serve -p 3000 & sleep infinity"]
