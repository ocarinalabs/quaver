import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, mutation } from "../_generated/server";

export const insert = internalMutation({
  args: {
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
  },
  returns: v.id("projects"),
  handler: async (ctx, args) => await ctx.db.insert("projects", args),
});

export const updateStatus = internalMutation({
  args: {
    projectId: v.id("projects"),
    status: v.union(
      v.literal("creating"),
      v.literal("generating"),
      v.literal("ready"),
      v.literal("stopped"),
      v.literal("archived"),
      v.literal("failed")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, { status: args.status });
    return null;
  },
});

export const rename = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, { name: args.name });
    return null;
  },
});

export const remove = mutation({
  args: {
    projectId: v.id("projects"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    await ctx.db.delete(args.projectId);

    if (project?.sandboxId) {
      await ctx.scheduler.runAfter(0, internal.projects.actions.deleteSandbox, {
        sandboxId: project.sandboxId,
      });
    }

    return null;
  },
});
