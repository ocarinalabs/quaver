import { v } from "convex/values";
import { mutation } from "../_generated/server";

const textPart = v.object({
  type: v.literal("text"),
  text: v.string(),
});

const reasoningPart = v.object({
  type: v.literal("reasoning"),
  text: v.string(),
  duration: v.optional(v.number()),
});

export const insert = mutation({
  args: {
    projectId: v.id("projects"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    parts: v.optional(v.array(v.union(textPart, reasoningPart))),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      projectId: args.projectId,
      role: args.role,
      content: args.content,
      parts: args.parts,
      createdAt: Date.now(),
    });
  },
});
