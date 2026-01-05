#!/usr/bin/env node
import { createInterface } from "node:readline";
import { query } from "@anthropic-ai/claude-agent-sdk";
import {
  generateBenchmark,
  isAssistant,
  isResult,
  isSystemInit,
} from "./agent/index.js";
import {
  DEFAULT_MODEL,
  DEFAULT_PERMISSION_MODE,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TOOLS,
  SETTING_SOURCES,
} from "./config/constants.js";

const isInteractive = process.argv.includes("--interactive");

if (isInteractive) {
  async function* generateMessages() {
    const rl = createInterface({ input: process.stdin });

    for await (const line of rl) {
      yield {
        type: "user" as const,
        message: {
          role: "user" as const,
          content: line,
        },
      };
    }
  }

  const runInteractive = async () => {
    for await (const message of query({
      prompt: generateMessages(),
      options: {
        model: DEFAULT_MODEL,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        allowedTools: DEFAULT_TOOLS,
        permissionMode: DEFAULT_PERMISSION_MODE,
        settingSources: SETTING_SOURCES,
        maxTurns: 50,
      },
    })) {
      console.log(JSON.stringify(message));

      if (isResult(message)) {
        console.log("---RESPONSE_END---");
      }
    }
  };

  runInteractive().catch((err) => {
    console.error(JSON.stringify({ type: "error", error: String(err) }));
    process.exit(1);
  });
} else {
  const prompt = process.argv.slice(2).join(" ");

  if (!prompt) {
    console.error("Usage: quaver <prompt>");
    console.error("       quaver --interactive");
    process.exit(1);
  }

  const run = async () => {
    for await (const msg of generateBenchmark(prompt)) {
      if (isSystemInit(msg)) {
        console.log("✅ Session started");
      }
      if (isAssistant(msg)) {
        for (const block of msg.message.content) {
          if (block.type === "text") {
            process.stdout.write(block.text);
          }
          if (block.type === "tool_use") {
            console.log(`\n🔧 ${block.name}`);
          }
        }
      }
      if (isResult(msg)) {
        console.log(`\n✅ Done: ${msg.subtype}`);
      }
    }
  };

  run().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
}
