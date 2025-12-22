/**
 * Parallel Processing Pattern
 *
 * Break down tasks into independent subtasks that execute simultaneously.
 * Aggregate results when all complete.
 *
 * Use for: Multi-document analysis, parallel reviews, batch processing
 *
 * [TODO]: Customize for your scenario
 */

import { gateway } from "@quaver/core/gateway";
import { generateObject, generateText } from "ai";
import { z } from "zod";

/**
 * Example: Parallel code review with multiple specialized reviewers.
 *
 * Flow:
 * 1. Launch parallel reviewers (security, performance, maintainability)
 * 2. Wait for all to complete
 * 3. Aggregate results
 *
 * [TODO]: Replace with your parallel workflow
 */
const runParallelWorkflow = async (input: string) => {
  const model = gateway("openai/gpt-5.2");

  // Run parallel tasks
  const [result1, result2, result3] = await Promise.all([
    // Task 1: [TODO] Your first parallel task
    generateObject({
      model,
      system: "[TODO]: Specialist 1 system prompt",
      schema: z.object({
        findings: z.array(z.string()),
        severity: z.enum(["low", "medium", "high"]),
        recommendations: z.array(z.string()),
      }),
      prompt: `Analyze: ${input}`,
    }),

    // Task 2: [TODO] Your second parallel task
    generateObject({
      model,
      system: "[TODO]: Specialist 2 system prompt",
      schema: z.object({
        issues: z.array(z.string()),
        impact: z.enum(["low", "medium", "high"]),
        suggestions: z.array(z.string()),
      }),
      prompt: `Analyze: ${input}`,
    }),

    // Task 3: [TODO] Your third parallel task
    generateObject({
      model,
      system: "[TODO]: Specialist 3 system prompt",
      schema: z.object({
        concerns: z.array(z.string()),
        score: z.number().min(1).max(10),
        improvements: z.array(z.string()),
      }),
      prompt: `Analyze: ${input}`,
    }),
  ]);

  const results = [
    { ...result1.object, type: "specialist1" },
    { ...result2.object, type: "specialist2" },
    { ...result3.object, type: "specialist3" },
  ];

  // Aggregate results
  const { text: summary } = await generateText({
    model,
    system: "You are synthesizing multiple specialist analyses.",
    prompt: `Synthesize these analyses into a concise summary:
    ${JSON.stringify(results, null, 2)}`,
  });

  return { results, summary };
};

export { runParallelWorkflow };
