import { v } from "convex/values";
import { query } from "../_generated/server";

const textPart = v.object({
  type: v.literal("text"),
  text: v.string(),
});

const reasoningPart = v.object({
  type: v.literal("reasoning"),
  text: v.string(),
  duration: v.optional(v.number()),
});

export const listByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      projectId: v.id("projects"),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      parts: v.optional(v.array(v.union(textPart, reasoningPart))),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) =>
    await ctx.db
      .query("messages")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .collect(),
});
