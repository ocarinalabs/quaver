import { stepCountIs, ToolLoopAgent } from "ai";
import { model, providerOptions } from "@/lib/model";
import { SYSTEM_PROMPT } from "./prompts";
import type { ChatContext } from "./tools/chat-quaver";
import { chatQuaverTool } from "./tools/chat-quaver";

const createChatAgent = (context: ChatContext) =>
  new ToolLoopAgent({
    model,
    providerOptions,
    instructions: SYSTEM_PROMPT,
    tools: { chatQuaver: chatQuaverTool },
    experimental_context: context,
    stopWhen: stepCountIs(10),
  });

export { createChatAgent };
export type { ChatContext } from "./tools/chat-quaver";
