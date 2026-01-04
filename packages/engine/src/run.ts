import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Sandbox } from "@daytonaio/sdk";
import type { Volume } from "@daytonaio/sdk/src/Volume";
import { createClient } from "@quaver/sandbox/client";
import { createSandbox, deleteSandbox } from "@quaver/sandbox/sandbox";
import { deleteVolume, getVolume } from "@quaver/sandbox/volume";
import type {
  BenchmarkResults,
  BenchmarkSpec,
  Phase,
  RunConfig,
  RunResult,
} from "./types.js";

const DEFAULT_SNAPSHOT = "quaver-agent";

export const generateRunId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `run-${timestamp}-${random}`;
};

export const getAgentRunnerScript = (): string => {
  const scriptPath = join(import.meta.dir, "..", "scripts", "agent-runner.ts");
  return readFileSync(scriptPath, "utf-8");
};

const runAgentPhase = async (
  sandbox: Sandbox,
  prompt: string,
  anthropicApiKey: string,
  onOutput?: (data: string) => void
): Promise<{ spec: BenchmarkSpec; duration: number }> => {
  const startTime = Date.now();

  await sandbox.fs.uploadFile(
    Buffer.from(getAgentRunnerScript()),
    "/home/daytona/agent-runner.ts"
  );

  const ptyHandle = await sandbox.process.createPty({
    id: "agent",
    onData: (data) => onOutput?.(data.toString()),
  });

  await ptyHandle.waitForConnection();

  const escapedPrompt = prompt.replace(/'/g, "'\\''");
  ptyHandle.sendInput(
    `ANTHROPIC_API_KEY='${anthropicApiKey}' bun /home/daytona/agent-runner.ts '${escapedPrompt}'\n`
  );

  await ptyHandle.wait();

  const specContent = await sandbox.fs.downloadFile("/output/spec.json");
  return {
    spec: JSON.parse(specContent.toString()),
    duration: Date.now() - startTime,
  };
};

const executeInSandbox = async (
  sandbox: Sandbox,
  code: string
): Promise<{ result: string; exitCode: number }> => {
  const response = await sandbox.process.codeRun(code);
  return {
    result: response.result || "",
    exitCode: response.exitCode,
  };
};

// TODO: Implement real benchmark execution
const runBenchmarkPhase = async (
  sandbox: Sandbox
): Promise<{ results: BenchmarkResults; duration: number }> => {
  const startTime = Date.now();

  const benchmarkCode = `
import fs from 'fs';
const spec = JSON.parse(fs.readFileSync('/input/spec.json', 'utf-8'));
const results = {
  score: 0.85,
  taskResults: spec.tasks.map((task) => ({
    taskId: task.id,
    passed: true,
    output: 'Task executed successfully',
    duration: 1000,
  })),
};
fs.writeFileSync('/output/results.json', JSON.stringify(results, null, 2));
console.log('Benchmark completed with score:', results.score);
`;

  const result = await executeInSandbox(sandbox, benchmarkCode);
  if (result.exitCode !== 0) {
    throw new Error(`Benchmark failed: ${result.result}`);
  }

  const resultsContent = await sandbox.fs.downloadFile("/output/results.json");
  const results: BenchmarkResults = JSON.parse(resultsContent.toString());

  return { results, duration: Date.now() - startTime };
};

const cleanup = async (
  agentSandbox: Sandbox | null,
  benchmarkSandbox: Sandbox | null,
  volume: Volume | null,
  client: ReturnType<typeof createClient>
): Promise<void> => {
  if (agentSandbox) {
    try {
      await deleteSandbox(agentSandbox);
    } catch {
      // Ignore cleanup errors
    }
  }
  if (benchmarkSandbox) {
    try {
      await deleteSandbox(benchmarkSandbox);
    } catch {
      // Ignore cleanup errors
    }
  }
  if (volume) {
    try {
      await deleteVolume(client, volume);
    } catch {
      // Ignore cleanup errors
    }
  }
};

export async function runBenchmark(config: RunConfig): Promise<RunResult> {
  const client = createClient();
  const runId = generateRunId();
  const startTime = Date.now();
  const snapshotName = config.snapshotName || DEFAULT_SNAPSHOT;
  const log = (phase: Phase, msg: string) => config.onProgress?.(phase, msg);

  let volume: Volume | null = null;
  let agentSandbox: Sandbox | null = null;
  let benchmarkSandbox: Sandbox | null = null;

  try {
    log("setup", "Creating shared volume...");
    volume = await getVolume(client, `benchmarks-${runId}`, true);

    log("agent", `Creating agent sandbox from snapshot: ${snapshotName}...`);
    agentSandbox = await createSandbox(client, {
      snapshot: snapshotName,
      name: `agent-${runId}`,
      volumes: [
        { volumeId: volume.id, mountPath: "/output", subpath: "agent" },
      ],
      autoStopInterval: 300, // 5 minutes for agent to complete
    });

    log("agent", "Running agent...");
    const { spec, duration: agentDuration } = await runAgentPhase(
      agentSandbox,
      config.prompt,
      config.anthropicApiKey,
      (output) => {
        // Stream agent output to progress callback
        process.stdout.write(output);
      }
    );
    await agentSandbox.stop();

    log("benchmark", "Creating benchmark sandbox...");
    benchmarkSandbox = await createSandbox(client, {
      language: "typescript",
      name: `benchmark-${runId}`,
      volumes: [
        { volumeId: volume.id, mountPath: "/input", subpath: "agent" },
        { volumeId: volume.id, mountPath: "/output", subpath: "benchmark" },
      ],
      autoStopInterval: 30,
    });

    log("benchmark", "Running benchmark...");
    const { results, duration: benchmarkDuration } =
      await runBenchmarkPhase(benchmarkSandbox);

    log("cleanup", "Cleaning up...");
    await cleanup(agentSandbox, benchmarkSandbox, volume, client);

    return {
      runId,
      spec,
      results,
      metrics: {
        agentDuration,
        benchmarkDuration,
        totalDuration: Date.now() - startTime,
      },
    };
  } catch (error) {
    log("cleanup", "Cleaning up after error...");
    await cleanup(agentSandbox, benchmarkSandbox, volume, client);
    throw error;
  }
}
