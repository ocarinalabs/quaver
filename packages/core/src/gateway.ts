/**
 * AI Gateway
 *
 * Shared AI SDK gateway configuration.
 * Import this to initialize the default provider.
 *
 * DevTools: Set AI_DEVTOOLS=true to enable debugging.
 * Then run: npx @ai-sdk/devtools
 */

import { devToolsMiddleware } from "@ai-sdk/devtools";
import { createGateway, type GatewayProvider } from "@ai-sdk/gateway";
import { wrapLanguageModel } from "ai";

const AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1/ai";

const baseGateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: AI_GATEWAY_BASE_URL,
});

/**
 * Gateway provider with optional devtools middleware.
 * When AI_DEVTOOLS=true, wraps models with devtools for debugging.
 */
const gateway: GatewayProvider =
  process.env.AI_DEVTOOLS === "true"
    ? Object.assign(
        (modelId: string) =>
          wrapLanguageModel({
            model: baseGateway(modelId),
            middleware: devToolsMiddleware(),
          }),
        baseGateway
      )
    : baseGateway;

(globalThis as Record<string, unknown>).AI_SDK_DEFAULT_PROVIDER = gateway;

export { gateway };
