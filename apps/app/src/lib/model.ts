import { createGateway } from "@ai-sdk/gateway";
import type { LanguageModel } from "ai";

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: "https://ai-gateway.vercel.sh/v1/ai",
});

export const MODEL_ID = "anthropic:claude-opus-4.5";

export const MAX_TOKENS = 200_000;

export const model: LanguageModel = gateway("anthropic/claude-opus-4.5");

export const providerOptions = {
  anthropic: {
    thinking: { type: "enabled" as const, budgetTokens: 10_000 },
  },
};
