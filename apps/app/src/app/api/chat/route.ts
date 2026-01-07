import { api } from "@quaver/backend/convex/_generated/api";
import type { Id } from "@quaver/backend/convex/_generated/dataModel";
import { createClient } from "@quaver/sandbox/client";
import { getSandbox } from "@quaver/sandbox/sandbox";
import { createAgentUIStreamResponse } from "ai";
import { fetchMutation } from "convex/nextjs";
import { createChatAgent } from "@/agents/chat-agent";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { messages, projectId, sandboxId } = await req.json();

  const lastMessage = messages.at(-1);
  if (lastMessage?.role === "user") {
    const textPart = lastMessage.parts?.find(
      (p: { type: string }) => p.type === "text"
    );
    if (textPart && "text" in textPart) {
      await fetchMutation(api.messages.mutations.insert, {
        projectId: projectId as Id<"projects">,
        role: "user",
        content: textPart.text,
        parts: [{ type: "text", text: textPart.text }],
      });
    }
  }

  if (!sandboxId) {
    return new Response("Sandbox not ready", { status: 400 });
  }
  const sandbox = await getSandbox(createClient(), sandboxId);
  const agent = createChatAgent({
    sandbox,
    sandboxId,
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
}
