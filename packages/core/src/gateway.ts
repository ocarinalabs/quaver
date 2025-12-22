/**
 * AI Gateway
 *
 * Shared AI SDK gateway configuration.
 * Import this to initialize the default provider.
 */

import { createGateway } from "@ai-sdk/gateway";

const AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1/ai";

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: AI_GATEWAY_BASE_URL,
});

(globalThis as Record<string, unknown>).AI_SDK_DEFAULT_PROVIDER = gateway;

export { gateway };
