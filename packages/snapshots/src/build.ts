#!/usr/bin/env bun

import { dirname, resolve } from "node:path";
import { $ } from "bun";

export const SNAPSHOTS = {
  agent: { cpu: 2, memory: 4, disk: 8 },
  core: { cpu: 1, memory: 1, disk: 3 },
} as const;

export type SnapshotName = keyof typeof SNAPSHOTS;

/** Parent of src/ - where Dockerfiles live */
export const DOCKERFILES_DIR = resolve(dirname(import.meta.dir));

export const build = async (name: SnapshotName): Promise<void> => {
  const tag = `quaver-${name}:v1`;
  const token = process.env.GITHUB_TOKEN;

  console.log(`\nBuilding ${tag}...`);

  // --load required for Daytona (buildx stores in separate cache otherwise)
  // --build-arg GITHUB_TOKEN for private repo access
  if (token) {
    await $`docker build --platform=linux/amd64 --load --build-arg GITHUB_TOKEN=${token} -t ${tag} ${DOCKERFILES_DIR}/${name}`.quiet();
  } else {
    await $`docker build --platform=linux/amd64 --load -t ${tag} ${DOCKERFILES_DIR}/${name}`.quiet();
  }

  console.log(`Built ${tag}`);
};

export const push = async (name: SnapshotName): Promise<void> => {
  const tag = `quaver-${name}:v1`;
  const snapshotName = `quaver-${name}`;
  const { cpu, memory, disk } = SNAPSHOTS[name];
  console.log(`\nPushing ${snapshotName}...`);
  await $`daytona snapshot push ${tag} --name ${snapshotName} --cpu ${cpu} --memory ${memory} --disk ${disk}`.quiet();
  console.log(`Pushed ${snapshotName}`);
};

export const clean = async (name: SnapshotName): Promise<void> => {
  const tag = `quaver-${name}:v1`;
  console.log(`\nCleaning ${tag}...`);
  await $`docker rmi ${tag}`.quiet().nothrow();
  console.log(`Cleaned ${tag}`);
};

export const list = async (): Promise<void> => {
  console.log("\nDaytona snapshots:");
  await $`daytona snapshot list`.quiet();
  console.log(await $`daytona snapshot list 2>&1 | grep -E "quaver"`.text());
};

export const parseArgs = (
  args: string[]
): { command: string | undefined; targets: SnapshotName[] } => {
  const [command, ...names] = args;
  const targets = names.length
    ? (names as SnapshotName[])
    : (Object.keys(SNAPSHOTS) as SnapshotName[]);
  return { command, targets };
};

export const printUsage = (): void => {
  console.log(`
Usage: bun src/build.ts <command> [snapshot...]

Commands:
  build   Build Docker images locally
  push    Push to Daytona registry
  deploy  Build, push, and clean (full cycle)
  clean   Remove local Docker images
  list    Show Daytona snapshots

Snapshots: agent, core (defaults to all)

Examples:
  bun src/build.ts deploy          # Deploy all
  bun src/build.ts build agent     # Build agent only
  bun src/build.ts push core       # Push core only
`);
};

export const main = async (): Promise<void> => {
  const { command, targets } = parseArgs(process.argv.slice(2));

  switch (command) {
    case "build":
      for (const name of targets) {
        await build(name);
      }
      break;
    case "push":
      for (const name of targets) {
        await push(name);
      }
      break;
    case "deploy":
      for (const name of targets) {
        await build(name);
        await push(name);
        await clean(name);
      }
      break;
    case "clean":
      for (const name of targets) {
        await clean(name);
      }
      break;
    case "list":
      await list();
      break;
    default:
      printUsage();
  }
};

if (import.meta.main) {
  main().catch(console.error);
}
