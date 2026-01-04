import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import type { Daytona } from "@daytonaio/sdk";
import type { Volume } from "@daytonaio/sdk/src/Volume";
import { createClient } from "../src/client";
import { deleteVolume, getVolume } from "../src/volume";

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("volume", () => {
  let client: Daytona;
  let testVolume: Volume | undefined;
  const volumeName = `test-volume-${Date.now()}`;

  beforeAll(() => {
    if (hasDaytona) {
      client = createClient();
    }
  });

  afterAll(async () => {
    if (testVolume) {
      try {
        await deleteVolume(client, testVolume);
      } catch {
        // Already deleted
      }
    }
  });

  test.skipIf(!hasDaytona)(
    "getVolume creates a new volume",
    async () => {
      testVolume = await getVolume(client, volumeName, true);
      expect(testVolume).toBeDefined();
      expect(testVolume.name).toBe(volumeName);
    },
    30_000
  );

  test.skipIf(!hasDaytona)("getVolume retrieves existing volume", async () => {
    if (!testVolume) {
      return;
    }
    const volume = await getVolume(client, volumeName);
    expect(volume.name).toBe(volumeName);
  });

  test.skipIf(!hasDaytona)(
    "deleteVolume deletes a volume",
    async () => {
      if (!testVolume) {
        return;
      }
      let deleted = false;
      for (let i = 0; i < 10 && !deleted; i++) {
        try {
          await deleteVolume(client, testVolume);
          deleted = true;
        } catch {
          await sleep(1000);
        }
      }
      expect(deleted).toBe(true);
      testVolume = undefined;
    },
    30_000
  );
});
