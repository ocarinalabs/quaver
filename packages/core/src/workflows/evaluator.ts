/**
 * Evaluator-Optimizer Pattern
 *
 * Add quality control with dedicated evaluation steps.
 * Retry with adjusted parameters or take corrective action based on evaluation.
 *
 * Use for: Quality-critical tasks, translation, content generation
 *
 * [TODO]: Customize for your scenario
 */

import { gateway } from "@quaver/core/gateway";
import { generateObject, generateText } from "ai";
import { z } from "zod";

/**
 * Example: Generate and iteratively improve until quality threshold met.
 *
 * Flow:
 * 1. Generate initial output
 * 2. Evaluate against criteria
 * 3. If below threshold, regenerate with feedback
 * 4. Repeat until quality met or max iterations
 *
 * [TODO]: Replace with your evaluator workflow
 */
const runEvaluatorWorkflow = async (
  input: string,
  maxIterations = 3,
  qualityThreshold = 8
) => {
  const model = gateway("openai/gpt-5.2");
  let currentOutput = "";
  let iterations = 0;

  // Step 1: Initial generation
  const { text: initialOutput } = await generateText({
    model,
    system: "[TODO]: Your generator system prompt",
    prompt: `Generate output for: ${input}`,
  });

  currentOutput = initialOutput;

  // Evaluation-optimization loop
  while (iterations < maxIterations) {
    // Step 2: Evaluate current output
    const { object: evaluation } = await generateObject({
      model,
      schema: z.object({
        qualityScore: z.number().min(1).max(10),
        meetsRequirements: z.boolean(),
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
        suggestions: z.array(z.string()),
      }),
      system: "[TODO]: Your evaluator system prompt",
      prompt: `Evaluate this output:

      Input: ${input}
      Output: ${currentOutput}

      Score quality 1-10 and identify improvements.`,
    });

    // Step 3: Check if quality meets threshold
    if (
      evaluation.qualityScore >= qualityThreshold &&
      evaluation.meetsRequirements
    ) {
      return {
        output: currentOutput,
        evaluation,
        iterations,
        converged: true,
      };
    }

    // Step 4: Regenerate with feedback
    const { text: improvedOutput } = await generateText({
      model,
      system: "[TODO]: Your generator system prompt",
      prompt: `Improve this output based on feedback:

      Original input: ${input}
      Current output: ${currentOutput}

      Weaknesses to address:
      ${evaluation.weaknesses.join("\n")}

      Suggestions:
      ${evaluation.suggestions.join("\n")}`,
    });

    currentOutput = improvedOutput;
    iterations += 1;
  }

  // Final evaluation
  const { object: finalEvaluation } = await generateObject({
    model,
    schema: z.object({
      qualityScore: z.number().min(1).max(10),
      meetsRequirements: z.boolean(),
    }),
    prompt: `Final evaluation of: ${currentOutput}`,
  });

  return {
    output: currentOutput,
    evaluation: finalEvaluation,
    iterations,
    converged: false,
  };
};

export { runEvaluatorWorkflow };
