"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, internalAction } from "../_generated/server";
import { daytona } from "../lib/daytona";

export const createSandbox = internalAction({
  args: {
    userId: v.id("users"),
    name: v.string(),
    prompt: v.string(),
  },
  returns: v.object({
    projectId: v.id("projects"),
    sandboxId: v.string(),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{ projectId: Id<"projects">; sandboxId: string }> => {
    const sandbox = await daytona.create({
      language: "typescript",
      snapshot: "quaver-agent",
      name: `project-${Date.now()}`,
      autoStopInterval: 0,
      public: true,
    });

    const projectId = await ctx.runMutation(
      internal.projects.mutations.insert,
      {
        userId: args.userId,
        name: args.name,
        prompt: args.prompt,
        sandboxId: sandbox.id,
        status: "creating",
        createdAt: Date.now(),
      }
    );

    return { projectId, sandboxId: sandbox.id };
  },
});

export const create = action({
  args: {
    name: v.string(),
    prompt: v.string(),
  },
  returns: v.object({
    projectId: v.id("projects"),
    sandboxId: v.string(),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{ projectId: Id<"projects">; sandboxId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(internal.auth.users.getUser, {
      subject: identity.subject,
    });
    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.runAction(internal.projects.actions.createSandbox, {
      userId: user._id,
      name: args.name,
      prompt: args.prompt,
    });
  },
});

export const stop = internalAction({
  args: { projectId: v.id("projects"), sandboxId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await daytona.stop(args.sandboxId);
    await ctx.runMutation(internal.projects.mutations.updateStatus, {
      projectId: args.projectId,
      status: "stopped",
    });
    return null;
  },
});

export const getStatus = internalAction({
  args: { sandboxId: v.string() },
  returns: v.object({ state: v.string() }),
  handler: async (_ctx, args): Promise<{ state: string }> => {
    const sandbox = await daytona.get(args.sandboxId);
    return { state: sandbox.state ?? "unknown" };
  },
});

export const start = internalAction({
  args: { sandboxId: v.string() },
  returns: v.null(),
  handler: async (_ctx, args) => {
    await daytona.start(args.sandboxId);
    return null;
  },
});

export const archive = internalAction({
  args: { sandboxId: v.string() },
  returns: v.null(),
  handler: async (_ctx, args) => {
    await daytona.archive(args.sandboxId);
    return null;
  },
});

export const deleteSandbox = internalAction({
  args: { sandboxId: v.string() },
  returns: v.null(),
  handler: async (_ctx, args) => {
    await daytona.delete(args.sandboxId);
    return null;
  },
});

export const testDaytonaConnection = internalAction({
  args: {},
  returns: v.object({ success: v.boolean(), sandboxId: v.string() }),
  handler: async () => {
    const sandbox = await daytona.create({
      language: "typescript",
      name: `test-${Date.now()}`,
    });
    await daytona.delete(sandbox.id);
    return { success: true, sandboxId: sandbox.id };
  },
});
