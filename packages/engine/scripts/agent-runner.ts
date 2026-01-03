#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const SYSTEM_PROMPT = `You are a benchmark generator. Your task is to create a benchmark specification for AI agent evaluation.

When you receive a prompt describing a benchmark scenario, you should:
1. Analyze the requirements
2. Design the benchmark structure
3. Output a JSON specification to /output/spec.json

The spec.json should have this structure:
{
  "name": "benchmark-name",
  "description": "What this benchmark tests",
  "tasks": [
    {
      "id": "task-1",
      "prompt": "The task prompt for the agent",
      "expectedOutcome": "How to evaluate success"
    }
  ],
  "config": {
    "maxSteps": 10,
    "timeoutSeconds": 300
  }
}

After generating the spec, write it to /output/spec.json using the Write tool.`;

const prompt = process.argv[2] || process.env.PROMPT;

if (!prompt) {
  console.error("Error: No prompt provided");
  console.error("Usage: bun agent-runner.ts 'Your benchmark description'");
  process.exit(1);
}

if (!existsSync("/output")) {
  mkdirSync("/output", { recursive: true });
}

console.log("Starting benchmark generation...");
console.log(`Prompt: ${prompt}`);

const claudeArgs = [
  "--dangerously-skip-permissions",
  "-p",
  `${SYSTEM_PROMPT}\n\nUser request: ${prompt}`,
  "--output-format",
  "stream-json",
  "--verbose",
];

const child = spawn("claude", claudeArgs, {
  stdio: ["inherit", "pipe", "pipe"],
  env: {
    ...process.env,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  },
});

let outputBuffer = "";

child.stdout?.on("data", (data: Buffer) => {
  outputBuffer += data.toString();
  process.stdout.write(data);
});

child.stderr?.on("data", (data: Buffer) => {
  process.stderr.write(data);
});

child.on("close", (code) => {
  if (code !== 0) {
    console.error(`\nClaude CLI exited with code ${code}`);
    process.exit(code ?? 1);
  }

  console.log("\n\nBenchmark generation complete.");

  // Check if spec.json was created by the agent
  if (existsSync("/output/spec.json")) {
    console.log("Spec written to /output/spec.json");
  } else {
    // If agent didn't write the spec, create a placeholder
    console.log(
      "Warning: Agent did not create spec.json, creating placeholder..."
    );
    const placeholderSpec = {
      name: "generated-benchmark",
      description: prompt,
      tasks: [
        {
          id: "task-1",
          prompt,
          expectedOutcome: "Task completed successfully",
        },
      ],
      config: {
        maxSteps: 10,
        timeoutSeconds: 300,
      },
      _note: "Placeholder spec - agent output was not structured",
      _rawOutput: outputBuffer.slice(0, 10_000), // Truncate if too long
    };
    writeFileSync(
      "/output/spec.json",
      JSON.stringify(placeholderSpec, null, 2)
    );
    console.log("Placeholder spec written to /output/spec.json");
  }

  process.exit(0);
});

child.on("error", (err) => {
  console.error("Failed to start Claude CLI:", err);
  process.exit(1);
});
