import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { createClient } from "../src/client";

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

describe("client", () => {
  test.skipIf(!hasDaytona)("createClient returns a Daytona instance", () => {
    const client = createClient();
    expect(client).toBeDefined();
    expect(typeof client.create).toBe("function");
    expect(typeof client.get).toBe("function");
    expect(typeof client.findOne).toBe("function");
  });
});
