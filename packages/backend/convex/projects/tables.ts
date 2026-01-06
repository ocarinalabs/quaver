import { defineTable } from "convex/server";
import { v } from "convex/values";

export const projectTables = {
  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    prompt: v.string(),
    sandboxId: v.string(),
    status: v.union(
      v.literal("creating"),
      v.literal("generating"),
      v.literal("ready"),
      v.literal("stopped"),
      v.literal("archived"),
      v.literal("failed")
    ),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_sandbox_id", ["sandboxId"])
    .index("by_status", ["status"]),
};
