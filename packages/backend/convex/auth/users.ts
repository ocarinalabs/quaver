import { createClerkClient, type UserJSON } from "@clerk/backend";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  type QueryCtx,
  query,
} from "../_generated/server";

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error("Missing CLERK_SECRET_KEY");
}

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export const userLoginStatus = query({
  args: {},
  returns: v.union(
    v.object({ status: v.literal("No JWT Token"), user: v.null() }),
    v.object({ status: v.literal("No Clerk User"), user: v.null() }),
    v.object({ status: v.literal("Logged In"), user: v.any() })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { status: "No JWT Token" as const, user: null };
    }
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { status: "No Clerk User" as const, user: null };
    }
    return { status: "Logged In" as const, user };
  },
});

export const currentUser = query({
  args: {},
  returns: v.union(v.null(), v.any()),
  handler: async (ctx) => getCurrentUser(ctx),
});

export const getUser = internalQuery({
  args: { subject: v.string() },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => userQuery(ctx, args.subject),
});

export const updateOrCreateUser = internalMutation({
  args: { clerkUser: v.any() },
  returns: v.null(),
  handler: async (ctx, { clerkUser }: { clerkUser: UserJSON }) => {
    const userRecord = await userQuery(ctx, clerkUser.id);
    if (userRecord) {
      await ctx.db.patch(userRecord._id, { clerkUser });
    } else {
      await ctx.db.insert("users", { clerkUser });
    }
    return null;
  },
});

export const deleteUserByClerkId = internalMutation({
  args: { id: v.string() },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const userRecord = await userQuery(ctx, id);
    if (userRecord) {
      await ctx.db.delete(userRecord._id);
    }
    return null;
  },
});

export function userQuery(
  ctx: QueryCtx,
  clerkUserId: string
): Promise<(Omit<Doc<"users">, "clerkUser"> & { clerkUser: UserJSON }) | null> {
  return ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkUser.id", clerkUserId))
    .unique();
}

export function userById(
  ctx: QueryCtx,
  id: Id<"users">
): Promise<(Omit<Doc<"users">, "clerkUser"> & { clerkUser: UserJSON }) | null> {
  return ctx.db.get(id);
}

async function getCurrentUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  return userQuery(ctx, identity.subject);
}

export async function mustGetCurrentUser(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}

export const deleteUser = action({
  args: {},
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx) => {
    const user = await ctx.runQuery(api.auth.users.currentUser);
    if (!user) {
      throw new Error("Not authenticated");
    }

    await ctx.runAction(internal.auth.users.deleteClerkUser, {
      clerkUserId: user.clerkUser.id,
    });
    await ctx.runMutation(internal.auth.users.deleteConvexUser, {
      userId: user._id,
    });

    return { success: true };
  },
});

export const deleteClerkUser = internalAction({
  args: { clerkUserId: v.string() },
  returns: v.object({ success: v.boolean() }),
  handler: async (_, { clerkUserId }) => {
    await clerkClient.users.deleteUser(clerkUserId);
    return { success: true };
  },
});

export const deleteConvexUser = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    await ctx.db.delete(userId);
    return null;
  },
});
