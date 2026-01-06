import { v } from "convex/values";
import { query } from "../_generated/server";

const projectType = v.object({
  _id: v.id("projects"),
  _creationTime: v.number(),
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
});

export const listForCurrentUser = query({
  args: {},
  returns: v.array(projectType),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUser.id", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const listByUser = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.array(
    v.object({
      _id: v.id("projects"),
      _creationTime: v.number(),
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
  ),
  handler: async (ctx, args) =>
    await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect(),
});

export const getById = query({
  args: {
    projectId: v.id("projects"),
  },
  returns: v.union(
    v.object({
      _id: v.id("projects"),
      _creationTime: v.number(),
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
    }),
    v.null()
  ),
  handler: async (ctx, args) => await ctx.db.get(args.projectId),
});

export const getBySandboxId = query({
  args: {
    sandboxId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("projects"),
      _creationTime: v.number(),
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
    }),
    v.null()
  ),
  handler: async (ctx, args) =>
    await ctx.db
      .query("projects")
      .withIndex("by_sandbox_id", (q) => q.eq("sandboxId", args.sandboxId))
      .first(),
});
