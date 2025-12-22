/**
 * Sequential Processing Pattern
 *
 * Execute steps in a predefined order where each step's output
 * becomes input for the next step.
 *
 * Use for: Content generation pipelines, data transformation, multi-stage processing
 *
 * [TODO]: Customize for your scenario
 */

import { gateway } from "@quaver/core/gateway";
import { generateObject, generateText } from "ai";
import { z } from "zod";

/**
 * Example: Sequential content generation with quality check.
 *
 * Flow:
 * 1. Generate initial content
 * 2. Evaluate quality
 * 3. If quality fails, regenerate with feedback
 *
 * [TODO]: Replace with your sequential workflow
 */
const runSequentialWorkflow = async (input: string) => {
  const model = gateway("openai/gpt-5.2");

  // Step 1: Generate initial content
  const { text: content } = await generateText({
    model,
    prompt: `[TODO]: Your first step prompt. Input: ${input}`,
  });

  // Step 2: Evaluate quality
  const { object: evaluation } = await generateObject({
    model,
    schema: z.object({
      score: z.number().min(1).max(10),
      issues: z.array(z.string()),
      suggestions: z.array(z.string()),
    }),
    prompt: `Evaluate this content:
    ${content}

    Provide:
    1. Quality score (1-10)
    2. Any issues found
    3. Improvement suggestions`,
  });

  // Step 3: If quality fails, regenerate
  if (evaluation.score < 7) {
    const { text: improvedContent } = await generateText({
      model,
      prompt: `Improve this content based on feedback:
      ${evaluation.issues.join("\n")}
      ${evaluation.suggestions.join("\n")}

      Original: ${content}`,
    });
    return { content: improvedContent, evaluation, improved: true };
  }

  return { content, evaluation, improved: false };
};

export { runSequentialWorkflow };
