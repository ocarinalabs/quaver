FROM node:22-slim

RUN apt-get update && apt-get install -y git curl wget ca-certificates unzip && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.com/install | bash

ENV PATH="/root/.bun/bin:$PATH"

WORKDIR /home/daytona

CMD ["sleep", "infinity"]
