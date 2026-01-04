export type Phase = "setup" | "agent" | "benchmark" | "cleanup";

export type RunConfig = {
  prompt: string;
  anthropicApiKey: string; // Required - passed into agent sandbox
  agentModel?: string;
  benchmarkModel?: string;
  snapshotName?: string; // Daytona snapshot name (default: "quaver-agent")
  resources?: {
    cpu?: number;
    memory?: number;
    disk?: number;
  };
  onProgress?: (phase: Phase, message: string) => void;
};

export type BenchmarkSpec = {
  name: string;
  description: string;
  tasks: Array<{
    id: string;
    prompt: string;
    expectedOutcome: string;
  }>;
  config?: {
    maxSteps?: number;
    timeoutSeconds?: number;
  };
};

export type BenchmarkResults = {
  score: number;
  taskResults: Array<{
    taskId: string;
    passed: boolean;
    output: string;
    duration: number;
  }>;
};

export type RunResult = {
  runId: string;
  spec: BenchmarkSpec;
  results: BenchmarkResults;
  metrics: {
    agentDuration: number;
    benchmarkDuration: number;
    totalDuration: number;
  };
};
