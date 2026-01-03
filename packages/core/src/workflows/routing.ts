/**
 * Routing Pattern
 *
 * Model decides which path to take through a workflow based on context.
 * Acts as an intelligent router directing flow between branches.
 *
 * Use for: Varied inputs requiring different processing, customer service, triage
 *
 * [TODO]: Customize for your scenario
 */

import { gateway } from "@quaver/core/gateway";
import { generateText, Output } from "ai";
import { z } from "zod";

/**
 * Example: Route queries to specialized handlers based on classification.
 *
 * Flow:
 * 1. Classify input
 * 2. Route to appropriate handler based on type and complexity
 * 3. Execute with specialized prompt/model
 *
 * [TODO]: Replace with your routing workflow
 */
const runRoutingWorkflow = async (input: string) => {
  const model = gateway("openai/gpt-5.2");

  // Step 1: Classify the input
  const { output: classification } = await generateText({
    model,
    output: Output.object({
      schema: z.object({
        reasoningText: z.string(),
        type: z.enum(["type_a", "type_b", "type_c"]), // [TODO]: Your categories
        complexity: z.enum(["simple", "complex"]),
        confidence: z.number().min(0).max(1),
      }),
    }),
    prompt: `Classify this input:
    ${input}

    Determine:
    1. Type (type_a, type_b, or type_c)
    2. Complexity (simple or complex)
    3. Confidence in classification (0-1)
    4. Brief reasoning`,
  });

  // Step 2: Route based on classification
  // Select model and prompt based on type + complexity
  const routeConfig = {
    type_a: {
      system: "[TODO]: Specialist A system prompt",
      model:
        classification.complexity === "simple"
          ? "openai/gpt-5.2-mini"
          : "openai/gpt-5.2",
    },
    type_b: {
      system: "[TODO]: Specialist B system prompt",
      model:
        classification.complexity === "simple"
          ? "openai/gpt-5.2-mini"
          : "openai/gpt-5.2",
    },
    type_c: {
      system: "[TODO]: Specialist C system prompt",
      model: "openai/gpt-5.2", // Always use full model for type_c
    },
  }[classification.type];

  // Step 3: Execute with routed configuration
  const { output: response } = await generateText({
    model: gateway(routeConfig.model),
    output: Output.text(),
    system: routeConfig.system,
    prompt: input,
  });

  return {
    classification,
    response,
    routedTo: classification.type,
    modelUsed: routeConfig.model,
  };
};

export { runRoutingWorkflow };
