import { afterAll, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  build,
  clean,
  DOCKERFILES_DIR,
  list,
  parseArgs,
  printUsage,
  push,
  SNAPSHOTS,
  type SnapshotName,
} from "../src/build";

const isDockerAvailable = (): boolean => {
  try {
    execSync("docker --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const isDaytonaAvailable = (): boolean => {
  try {
    execSync("daytona version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const hasDocker = isDockerAvailable();
const hasDaytona = isDaytonaAvailable();

const SNAPSHOTS_PATH_PATTERN = /packages\/snapshots$/;
const DOCKER_TAG_PATTERN = /^quaver-(agent|core):v1$/;
const SNAPSHOT_NAME_PATTERN = /^quaver-(agent|core)$/;

describe("build", () => {
  describe("SNAPSHOTS config", () => {
    test("defines agent snapshot with correct resources", () => {
      expect(SNAPSHOTS.agent).toEqual({ cpu: 2, memory: 4, disk: 8 });
    });

    test("defines core snapshot with correct resources", () => {
      expect(SNAPSHOTS.core).toEqual({ cpu: 1, memory: 1, disk: 3 });
    });

    test("has exactly two snapshots", () => {
      const names = Object.keys(SNAPSHOTS);
      expect(names).toHaveLength(2);
      expect(names).toContain("agent");
      expect(names).toContain("core");
    });
  });

  describe("DOCKERFILES_DIR", () => {
    test("points to package root (parent of src/)", () => {
      expect(DOCKERFILES_DIR).toMatch(SNAPSHOTS_PATH_PATTERN);
    });

    test("agent Dockerfile exists", () => {
      expect(existsSync(resolve(DOCKERFILES_DIR, "agent", "Dockerfile"))).toBe(
        true
      );
    });

    test("core Dockerfile exists", () => {
      expect(existsSync(resolve(DOCKERFILES_DIR, "core", "Dockerfile"))).toBe(
        true
      );
    });
  });

  describe("parseArgs", () => {
    test("parses command with no targets (defaults to all)", () => {
      const result = parseArgs(["build"]);
      expect(result.command).toBe("build");
      expect(result.targets).toEqual(["agent", "core"]);
    });

    test("parses command with single target", () => {
      const result = parseArgs(["build", "agent"]);
      expect(result.command).toBe("build");
      expect(result.targets).toEqual(["agent"]);
    });

    test("parses command with multiple targets", () => {
      const result = parseArgs(["push", "agent", "core"]);
      expect(result.command).toBe("push");
      expect(result.targets).toEqual(["agent", "core"]);
    });

    test("returns undefined command for empty args", () => {
      const result = parseArgs([]);
      expect(result.command).toBeUndefined();
      expect(result.targets).toEqual(["agent", "core"]);
    });

    test("handles deploy command", () => {
      const result = parseArgs(["deploy"]);
      expect(result.command).toBe("deploy");
    });

    test("handles clean command", () => {
      const result = parseArgs(["clean", "core"]);
      expect(result.command).toBe("clean");
      expect(result.targets).toEqual(["core"]);
    });

    test("handles list command", () => {
      const result = parseArgs(["list"]);
      expect(result.command).toBe("list");
    });
  });

  describe("printUsage", () => {
    test("prints usage without throwing", () => {
      expect(() => printUsage()).not.toThrow();
    });
  });

  describe("Dockerfile content validation", () => {
    test("agent Dockerfile contains required tools", () => {
      const content = readFileSync(
        resolve(DOCKERFILES_DIR, "agent", "Dockerfile"),
        "utf-8"
      );

      expect(content).toContain("FROM node:22-slim");
      expect(content).toContain("bun.com/install");
      expect(content).toContain("claude-code");
      expect(content).toContain("typescript");
      expect(content).toContain("WORKDIR /home/daytona");
    });

    test("core Dockerfile is lighter (no claude-code)", () => {
      const content = readFileSync(
        resolve(DOCKERFILES_DIR, "core", "Dockerfile"),
        "utf-8"
      );

      expect(content).toContain("FROM node:22-slim");
      expect(content).toContain("bun.com/install");
      expect(content).not.toContain("claude-code");
      expect(content).toContain("WORKDIR /home/daytona");
    });
  });

  describe("snapshot naming conventions", () => {
    test("generates correct Docker tags", () => {
      for (const name of ["agent", "core"] as SnapshotName[]) {
        expect(`quaver-${name}:v1`).toMatch(DOCKER_TAG_PATTERN);
      }
    });

    test("generates correct Daytona snapshot names", () => {
      for (const name of ["agent", "core"] as SnapshotName[]) {
        expect(`quaver-${name}`).toMatch(SNAPSHOT_NAME_PATTERN);
      }
    });
  });

  describe("Docker integration", () => {
    const testImageName = "quaver-core:v1";

    afterAll(() => {
      if (hasDocker) {
        try {
          execSync(`docker rmi ${testImageName} 2>/dev/null`, {
            stdio: "ignore",
          });
        } catch {
          // Image may not exist
        }
      }
    });

    test.skipIf(!hasDocker)(
      "build() creates Docker image for core",
      async () => {
        await build("core");

        const result = execSync(
          `docker images ${testImageName} --format "{{.Repository}}:{{.Tag}}"`
        )
          .toString()
          .trim();

        expect(result).toBe(testImageName);
      },
      120_000
    );

    test.skipIf(!hasDocker)(
      "clean() removes Docker image",
      async () => {
        await build("core");
        await clean("core");

        const result = execSync(
          `docker images ${testImageName} --format "{{.Repository}}"`
        )
          .toString()
          .trim();

        expect(result).toBe("");
      },
      30_000
    );

    test.skipIf(!hasDocker)("Docker is running", () => {
      const result = execSync("docker info --format '{{.ServerVersion}}'")
        .toString()
        .trim();
      expect(result).toBeTruthy();
    });
  });

  describe("Daytona integration", () => {
    test.skipIf(!hasDaytona)("Daytona CLI is available", () => {
      const result = execSync("daytona version").toString();
      expect(result).toContain("Daytona");
    });

    test.skipIf(!hasDaytona)("can list snapshots", () => {
      expect(() => {
        execSync("daytona snapshot list", { stdio: "ignore" });
      }).not.toThrow();
    });

    test.skipIf(!hasDaytona)("list() shows Daytona snapshots", async () => {
      await expect(list()).resolves.toBeUndefined();
    });

    test.skipIf(!(hasDocker && hasDaytona))(
      "push() pushes core snapshot to Daytona",
      async () => {
        await build("core");

        try {
          await push("core");
        } catch {
          // Snapshot may already exist
        }

        const result = execSync("daytona snapshot list").toString();
        expect(result).toContain("quaver-core");

        await clean("core");
      },
      180_000
    );
  });

  describe("main() CLI", () => {
    test.skipIf(!hasDocker)(
      "CLI: bun src/build.ts build core",
      () => {
        const result = execSync("bun src/build.ts build core", {
          cwd: DOCKERFILES_DIR,
        }).toString();
        expect(result).toContain("Built quaver-core:v1");
      },
      120_000
    );

    test.skipIf(!hasDocker)("CLI: bun src/build.ts clean core", () => {
      const result = execSync("bun src/build.ts clean core", {
        cwd: DOCKERFILES_DIR,
      }).toString();
      expect(result).toContain("Cleaned quaver-core:v1");
    });

    test("CLI: bun src/build.ts (no args shows usage)", () => {
      const result = execSync("bun src/build.ts", {
        cwd: DOCKERFILES_DIR,
      }).toString();
      expect(result).toContain("Usage:");
      expect(result).toContain("Commands:");
    });
  });
});
