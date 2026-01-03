import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";

export const benchmarkToolsServer = createSdkMcpServer({
  name: "benchmark-tools",
  version: "1.0.0",
  tools: [
    tool(
      "get_framework_info",
      "Get information about the Quaver benchmark framework",
      {},
      async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              name: "Quaver Core",
              version: "1.0.0",
              description: "AI agent benchmarking framework",
            }),
          },
        ],
      })
    ),
  ],
});
