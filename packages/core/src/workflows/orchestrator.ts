/**
 * Orchestrator-Worker Pattern
 *
 * A primary model (orchestrator) coordinates specialized workers.
 * Each worker optimizes for a specific subtask.
 *
 * Use for: Complex tasks requiring different expertise, feature implementation
 *
 * [TODO]: Customize for your scenario
 */

import { gateway } from "@quaver/core/gateway";
import { generateObject } from "ai";
import { z } from "zod";

/**
 * Example: Orchestrator plans, workers execute.
 *
 * Flow:
 * 1. Orchestrator analyzes request and creates plan
 * 2. Workers execute planned tasks in parallel
 * 3. Results aggregated
 *
 * [TODO]: Replace with your orchestrator workflow
 */
const runOrchestratorWorkflow = async (request: string) => {
  const model = gateway("openai/gpt-5.2");

  // Step 1: Orchestrator creates plan
  const { object: plan } = await generateObject({
    model,
    schema: z.object({
      tasks: z.array(
        z.object({
          id: z.string(),
          description: z.string(),
          workerType: z.enum(["analyst", "implementer", "reviewer"]),
          dependencies: z.array(z.string()).optional(),
        })
      ),
      estimatedComplexity: z.enum(["low", "medium", "high"]),
    }),
    system:
      "You are a senior architect planning task execution. Break down requests into discrete tasks.",
    prompt: `Create an execution plan for: ${request}`,
  });

  // Step 2: Workers execute tasks
  const taskResults = await Promise.all(
    plan.tasks.map(async (task) => {
      // Select worker based on type
      const workerPrompt = {
        analyst: "You are an analyst. Research and provide insights.",
        implementer: "You are an implementer. Write code and solutions.",
        reviewer: "You are a reviewer. Check quality and suggest improvements.",
      }[task.workerType];

      const { object: result } = await generateObject({
        model,
        schema: z.object({
          taskId: z.string(),
          output: z.string(),
          status: z.enum(["completed", "needs_review", "blocked"]),
          notes: z.array(z.string()).optional(),
        }),
        system: workerPrompt,
        prompt: `Execute task: ${task.description}

        Context: ${request}`,
      });

      return { task, result };
    })
  );

  return {
    plan,
    results: taskResults,
  };
};

export { runOrchestratorWorkflow };
