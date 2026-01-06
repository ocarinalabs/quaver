import { defineTable } from "convex/server";
import { v } from "convex/values";

const textPart = v.object({
  type: v.literal("text"),
  text: v.string(),
});

const reasoningPart = v.object({
  type: v.literal("reasoning"),
  text: v.string(),
  duration: v.optional(v.number()),
});

export const messageTables = {
  messages: defineTable({
    projectId: v.id("projects"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    parts: v.optional(v.array(v.union(textPart, reasoningPart))),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),
};
