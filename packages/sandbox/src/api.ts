import type { Sandbox, SandboxState } from "@daytonaio/api-client";

const DAYTONA_API_URL =
  process.env.DAYTONA_API_URL ?? "https://app.daytona.io/api";
const DEFAULT_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1000;

export function createDaytonaApi(apiKey?: string) {
  const key = apiKey ?? process.env.DAYTONA_API_KEY;

  function getHeaders(): HeadersInit {
    if (!key) {
      throw new Error("DAYTONA_API_KEY not set");
    }
    return {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    };
  }

  async function getSandbox(sandboxId: string): Promise<Sandbox> {
    const res = await fetch(`${DAYTONA_API_URL}/sandbox/${sandboxId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Daytona get failed: ${res.status}`);
    }
    return res.json();
  }

  async function waitForState(
    sandboxId: string,
    targetState: SandboxState,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): Promise<Sandbox> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const sandbox = await getSandbox(sandboxId);
      if (sandbox.state === targetState) {
        return sandbox;
      }
      if (sandbox.state === "error") {
        throw new Error(`Sandbox entered error state: ${sandbox.errorReason}`);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    throw new Error(
      `Timeout waiting for sandbox ${sandboxId} to reach state ${targetState}`
    );
  }

  return {
    async create(params?: {
      language?: string;
      snapshot?: string;
      name?: string;
      autoStopInterval?: number;
      public?: boolean;
    }): Promise<Sandbox> {
      const res = await fetch(`${DAYTONA_API_URL}/sandbox`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        throw new Error(`Daytona create failed: ${res.status}`);
      }
      return res.json();
    },

    get: getSandbox,

    async start(sandboxId: string, wait = true): Promise<void> {
      const res = await fetch(`${DAYTONA_API_URL}/sandbox/${sandboxId}/start`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Daytona start failed: ${res.status}`);
      }
      if (wait) {
        await waitForState(sandboxId, "started");
      }
    },

    async stop(sandboxId: string, wait = true): Promise<void> {
      const res = await fetch(`${DAYTONA_API_URL}/sandbox/${sandboxId}/stop`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Daytona stop failed: ${res.status}`);
      }
      if (wait) {
        await waitForState(sandboxId, "stopped");
      }
    },

    async archive(sandboxId: string): Promise<void> {
      const res = await fetch(
        `${DAYTONA_API_URL}/sandbox/${sandboxId}/archive`,
        {
          method: "POST",
          headers: getHeaders(),
        }
      );
      if (!res.ok) {
        throw new Error(`Daytona archive failed: ${res.status}`);
      }
    },

    async delete(sandboxId: string): Promise<void> {
      const res = await fetch(`${DAYTONA_API_URL}/sandbox/${sandboxId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Daytona delete failed: ${res.status}`);
      }
    },

    async executeCommand(
      sandboxId: string,
      command: string,
      cwd?: string
    ): Promise<{ result: string; exitCode: number }> {
      const res = await fetch(
        `${DAYTONA_API_URL}/toolbox/${sandboxId}/toolbox/process/execute`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ command, cwd }),
        }
      );
      if (!res.ok) {
        throw new Error(`Daytona executeCommand failed: ${res.status}`);
      }
      return res.json();
    },
  };
}

export const daytona = createDaytonaApi();
