import type { Sandbox } from "@daytonaio/sdk";
import { tool } from "ai";
import { z } from "zod";
import {
  getOrCreateQuaverSession,
  killQuaverSession,
  sendToQuaver,
} from "@/lib/pty-manager";

type ChatContext = {
  sandbox: Sandbox;
  sandboxId: string;
};

const chatQuaverTool = tool({
  description:
    "Send a message to the quaver coding agent for iterative development",
  inputSchema: z.object({
    message: z.string().describe("The message to send to quaver"),
  }),
  strict: true,
  execute: async ({ message }, { experimental_context }) => {
    const { sandbox, sandboxId } = experimental_context as ChatContext;

    await getOrCreateQuaverSession(sandbox, sandboxId);
    const response = await sendToQuaver(sandboxId, message);

    if (response.includes("Invalid API key") || response.includes("/login")) {
      await killQuaverSession(sandboxId);
      return {
        success: false,
        result:
          "Authentication required. Please run `claude` in the sandbox to login, then try again.",
        toolCalls: [],
      };
    }

    const messages = response
      .trim()
      .split("\n")
      .filter((line) => line.startsWith("{"))
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    type ToolUseBlock = {
      type: string;
      id: string;
      name: string;
      input: unknown;
    };

    const toolCalls = messages
      .filter((m: { type: string }) => m.type === "assistant")
      .flatMap(
        (m: { message?: { content?: unknown[] } }) =>
          (m.message?.content ?? []) as ToolUseBlock[]
      )
      .filter((block) => block.type === "tool_use")
      .map((block) => ({
        id: block.id,
        name: block.name,
        input: block.input,
      }));

    const toolResults = new Map<string, string>();
    for (const msg of messages) {
      if (msg.type === "user") {
        for (const content of msg.message?.content ?? []) {
          if (content.type === "tool_result") {
            toolResults.set(content.tool_use_id, content.content);
          }
        }
      }
    }

    const toolsWithResults = toolCalls.map((tc) => ({
      ...tc,
      output: toolResults.get(tc.id),
      state: toolResults.has(tc.id) ? "output-available" : "input-available",
    }));

    const resultMessage = messages.find(
      (m: { type: string }) => m.type === "result"
    );

    return {
      success: true,
      result: resultMessage?.result ?? "Task completed",
      toolCalls: toolsWithResults,
    };
  },
});

export { chatQuaverTool };
export type { ChatContext };
