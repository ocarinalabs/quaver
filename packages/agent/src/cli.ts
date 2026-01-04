#!/usr/bin/env node
import {
  generateBenchmark,
  isAssistant,
  isResult,
  isSystemInit,
} from "./agent/index.js";

const prompt = process.argv.slice(2).join(" ");

if (!prompt) {
  console.error("Usage: quaver-agent <prompt>");
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
