import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import type { Daytona, Sandbox } from "@daytonaio/sdk";
import { createClient } from "../src/client";
import {
  archiveSandbox,
  createSandbox,
  deleteSandbox,
  findSandbox,
  getSandbox,
  startSandbox,
  stopSandbox,
} from "../src/sandbox";

const isDaytonaAvailable = (): boolean => {
  try {
    execSync("daytona version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const hasCredentials = (): boolean =>
  Boolean(process.env.DAYTONA_API_KEY || process.env.DAYTONA_JWT_TOKEN);

const hasDaytona = isDaytonaAvailable() && hasCredentials();

describe("sandbox", () => {
  let client: Daytona;
  let testSandbox: Sandbox | undefined;

  beforeAll(() => {
    if (hasDaytona) {
      client = createClient();
    }
  });

  afterAll(async () => {
    if (testSandbox) {
      try {
        await deleteSandbox(testSandbox);
      } catch {
        // Already deleted
      }
    }
  });

  test.skipIf(!hasDaytona)(
    "createSandbox creates a sandbox from snapshot",
    async () => {
      testSandbox = await createSandbox(client, { snapshot: "quaver-agent" });
      expect(testSandbox).toBeDefined();
      expect(testSandbox.id).toBeTruthy();
    },
    60_000
  );

  test.skipIf(!hasDaytona)("getSandbox retrieves sandbox by id", async () => {
    if (!testSandbox) {
      return;
    }
    const sandbox = await getSandbox(client, testSandbox.id);
    expect(sandbox.id).toBe(testSandbox.id);
  });

  test.skipIf(!hasDaytona)(
    "findSandbox finds sandbox by id or name",
    async () => {
      if (!testSandbox) {
        return;
      }
      const sandbox = await findSandbox(client, testSandbox.id);
      expect(sandbox.id).toBe(testSandbox.id);
    }
  );

  test.skipIf(!hasDaytona)(
    "stopSandbox stops a running sandbox",
    async () => {
      if (!testSandbox) {
        return;
      }
      await stopSandbox(testSandbox);
      const sandbox = await getSandbox(client, testSandbox.id);
      expect(sandbox.state).toBe("stopped");
    },
    30_000
  );

  test.skipIf(!hasDaytona)(
    "startSandbox starts a stopped sandbox",
    async () => {
      if (!testSandbox) {
        return;
      }
      await startSandbox(testSandbox);
      const sandbox = await getSandbox(client, testSandbox.id);
      expect(sandbox.state).toBe("started");
    },
    30_000
  );

  test.skipIf(!hasDaytona)(
    "archiveSandbox initiates archive",
    async () => {
      if (!testSandbox) {
        return;
      }
      await stopSandbox(testSandbox);
      await archiveSandbox(testSandbox);
      const sandbox = await getSandbox(client, testSandbox.id);
      expect(["archiving", "archived"]).toContain(sandbox.state);
    },
    30_000
  );

  test.skipIf(!hasDaytona)(
    "deleteSandbox deletes a sandbox",
    async () => {
      if (!testSandbox) {
        return;
      }
      await deleteSandbox(testSandbox);
      testSandbox = undefined;
    },
    30_000
  );
});
