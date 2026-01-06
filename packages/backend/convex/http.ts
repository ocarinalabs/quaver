import type { WebhookEvent } from "@clerk/backend";
import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

function ensureEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

async function validateClerkWebhook(
  request: Request
): Promise<WebhookEvent | undefined> {
  const svixHeaders = {
    "svix-id": request.headers.get("svix-id"),
    "svix-timestamp": request.headers.get("svix-timestamp"),
    "svix-signature": request.headers.get("svix-signature"),
  };

  if (
    !(
      svixHeaders["svix-id"] &&
      svixHeaders["svix-timestamp"] &&
      svixHeaders["svix-signature"]
    )
  ) {
    return;
  }

  try {
    const payload = await request.text();
    const wh = new Webhook(ensureEnv("CLERK_WEBHOOK_SECRET"));
    return wh.verify(
      payload,
      svixHeaders as Record<string, string>
    ) as WebhookEvent;
  } catch {
    return;
  }
}

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateClerkWebhook(request);
    if (!event) {
      return new Response("Invalid webhook", { status: 400 });
    }

    switch (event.type) {
      case "user.created":
      case "user.updated":
        await ctx.runMutation(internal.auth.users.updateOrCreateUser, {
          clerkUser: event.data,
        });
        break;
      case "user.deleted":
        if (event.data.id) {
          await ctx.runMutation(internal.auth.users.deleteUserByClerkId, {
            id: event.data.id,
          });
        }
        break;
      default:
        break;
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
