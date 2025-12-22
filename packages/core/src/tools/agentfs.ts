/**
 * AgentFS Tools
 *
 * Persistent storage tools powered by AgentFS (Turso).
 * Provides key-value store and filesystem operations.
 *
 * Compare with tools/memory.ts (in-memory, ephemeral) for A/B testing.
 */

import type { AgentFS } from "agentfs-sdk";
import { tool } from "ai";
import { z } from "zod";

/** State type that includes AgentFS instance */
type AgentFSState = {
  agent: AgentFS;
  [key: string]: unknown;
};

// ============================================
// KEY-VALUE TOOLS
// ============================================

const kvGetTool = tool({
  description:
    "Get a value from persistent key-value store. Values persist across sessions.",
  inputSchema: z.object({
    key: z.string().describe("The key to retrieve"),
  }),
  execute: async ({ key }, { experimental_context }) => {
    const { agent } = experimental_context as AgentFSState;
    const value = await agent.kv.get(key);
    return { found: value !== undefined, key, value };
  },
});

const kvSetTool = tool({
  description:
    "Store a value in persistent key-value store. Supports any JSON-serializable value.",
  inputSchema: z.object({
    key: z
      .string()
      .describe(
        'The key to store under (use colons for namespacing, e.g., "user:123:name")'
      ),
    value: z.string().describe("The value to store"),
  }),
  execute: async ({ key, value }, { experimental_context }) => {
    const { agent } = experimental_context as AgentFSState;
    await agent.kv.set(key, value);
    return { success: true, key };
  },
});

const kvDeleteTool = tool({
  description: "Delete a key from the key-value store",
  inputSchema: z.object({
    key: z.string().describe("The key to delete"),
  }),
  execute: async ({ key }, { experimental_context }) => {
    const { agent } = experimental_context as AgentFSState;
    await agent.kv.delete(key);
    return { success: true, key };
  },
});

const kvListTool = tool({
  description: "List keys in the key-value store. Optionally filter by prefix.",
  inputSchema: z.object({
    prefix: z
      .string()
      .optional()
      .default("")
      .describe("Filter keys starting with this prefix"),
  }),
  execute: async ({ prefix }, { experimental_context }) => {
    const { agent } = experimental_context as AgentFSState;
    const entries = await agent.kv.list(prefix ?? "");
    return { entries, count: entries.length };
  },
});

// ============================================
// FILESYSTEM TOOLS
// ============================================

const writeFileTool = tool({
  description:
    "Write content to a file in the virtual filesystem. Use for notes, reports, data. Parent directories are created automatically.",
  inputSchema: z.object({
    path: z
      .string()
      .describe("File path (e.g., /notes/plan.md, /outputs/report.txt)"),
    content: z.string().describe("Content to write"),
  }),
  execute: async ({ path, content }, { experimental_context }) => {
    const { agent } = experimental_context as AgentFSState;
    await agent.fs.writeFile(path, content);
    return { success: true, path, bytes: content.length };
  },
});

const readFileTool = tool({
  description: "Read content from a file",
  inputSchema: z.object({
    path: z.string().describe("File path to read"),
  }),
  execute: async ({ path }, { experimental_context }) => {
    const { agent } = experimental_context as AgentFSState;
    try {
      const content = await agent.fs.readFile(path, "utf8");
      return { success: true, path, content };
    } catch {
      return { success: false, path, error: "File not found" };
    }
  },
});

const listFilesTool = tool({
  description: "List files and directories in a path",
  inputSchema: z.object({
    path: z.string().default("/").describe("Directory path (default: root)"),
  }),
  execute: async ({ path }, { experimental_context }) => {
    const { agent } = experimental_context as AgentFSState;
    try {
      const files = await agent.fs.readdir(path);
      return { success: true, path, files, count: files.length };
    } catch {
      return { success: false, path, files: [], error: "Directory not found" };
    }
  },
});

const deleteFileTool = tool({
  description: "Delete a file",
  inputSchema: z.object({
    path: z.string().describe("File path to delete"),
  }),
  execute: async ({ path }, { experimental_context }) => {
    const { agent } = experimental_context as AgentFSState;
    await agent.fs.deleteFile(path);
    return { success: true, path };
  },
});

const fileStatTool = tool({
  description: "Get file metadata (size, created time, modified time)",
  inputSchema: z.object({
    path: z.string().describe("File path to check"),
  }),
  execute: async ({ path }, { experimental_context }) => {
    const { agent } = experimental_context as AgentFSState;
    try {
      const stats = await agent.fs.stat(path);
      return {
        success: true,
        path,
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        created: new Date(stats.ctime * 1000).toISOString(),
        modified: new Date(stats.mtime * 1000).toISOString(),
      };
    } catch {
      return { success: false, path, error: "File not found" };
    }
  },
});

const fileExistsTool = tool({
  description: "Check if a file or directory exists at the given path",
  inputSchema: z.object({
    path: z.string().describe("File or directory path to check"),
  }),
  execute: async ({ path: filePath }, { experimental_context }) => {
    const { agent } = experimental_context as AgentFSState;
    const fs = agent.fs as typeof agent.fs & {
      exists(p: string): Promise<boolean>;
    };
    const exists = await fs.exists(filePath);
    return { path: filePath, exists };
  },
});

// ============================================
// TOOL TRACKING TOOLS
// ============================================

const toolsListTool = tool({
  description:
    "List recent tool calls made during this session. Useful for reviewing what actions have been taken.",
  inputSchema: z.object({
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of tool calls to return"),
  }),
  execute: async ({ limit }, { experimental_context }) => {
    const { agent } = experimental_context as AgentFSState;
    // Use getRecent with since=0 to get all tool calls, limited by count
    const tools = await agent.tools.getRecent(0, limit);
    return { tools, count: tools.length };
  },
});

const toolsGetTool = tool({
  description: "Get details of a specific tool call by ID",
  inputSchema: z.object({
    id: z.number().describe("The tool call ID to retrieve"),
  }),
  execute: async ({ id }, { experimental_context }) => {
    const { agent } = experimental_context as AgentFSState;
    const toolCall = await agent.tools.get(id);
    if (toolCall) {
      return { found: true, toolCall };
    }
    return { found: false, id, error: "Tool call not found" };
  },
});

// ============================================
// EXPORTS
// ============================================

/** All AgentFS tools in one object for easy import */
const agentfsTools = {
  // Key-Value (4)
  kvGet: kvGetTool,
  kvSet: kvSetTool,
  kvDelete: kvDeleteTool,
  kvList: kvListTool,
  // Filesystem (6)
  writeFile: writeFileTool,
  readFile: readFileTool,
  listFiles: listFilesTool,
  deleteFile: deleteFileTool,
  fileStat: fileStatTool,
  fileExists: fileExistsTool,
  // Tool Tracking (2)
  toolsList: toolsListTool,
  toolsGet: toolsGetTool,
};

export {
  // KV
  kvGetTool,
  kvSetTool,
  kvDeleteTool,
  kvListTool,
  // FS
  writeFileTool,
  readFileTool,
  listFilesTool,
  deleteFileTool,
  fileStatTool,
  fileExistsTool,
  // Tool Tracking
  toolsListTool,
  toolsGetTool,
  // Grouped
  agentfsTools,
  // Type
  type AgentFSState,
};
