import type { Sandbox } from "@daytonaio/sdk";
import { runAgentViaPty } from "@quaver/sandbox/sandbox/pty";
import { tool } from "ai";
import { z } from "zod";

type ChatContext = {
  sandbox: Sandbox;
  apiKey: string;
};

const runQuaverTool = tool({
  description:
    "Run the quaver coding agent to generate code. Use when the user wants to create a benchmark, write code, or build something in the sandbox.",
  inputSchema: z.object({
    prompt: z.string().describe("The task description for the coding agent"),
  }),
  strict: true,
  execute: async ({ prompt }, { experimental_context }) => {
    const { sandbox, apiKey } = experimental_context as ChatContext;

    const result = await runAgentViaPty(sandbox, prompt, apiKey);

    return {
      success: result.exitCode === 0,
      exitCode: result.exitCode,
      message: result.exitCode === 0 ? "Agent completed" : "Agent failed",
    };
  },
});

export { runQuaverTool };
