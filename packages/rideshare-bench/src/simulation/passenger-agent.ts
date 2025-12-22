/**
 * Passenger Agent
 *
 * LLM-based passenger that evaluates ride experiences.
 * Called after each ride completion to determine rating and tip.
 */

import { Experimental_Agent as Agent, stepCountIs } from "ai";
import {
  createPassengerPrompt,
  formatRideSummary,
} from "../agent/passenger-prompts.js";
import type { ActiveRide, RideshareState } from "../config/types.js";
import {
  type PassengerEvaluation,
  passengerTools,
} from "../tools/passenger/index.js";

/** State extended with passenger evaluation storage */
type StateWithEvaluation = RideshareState & {
  _passengerEvaluation: PassengerEvaluation;
};

/**
 * Run the passenger agent to evaluate a completed ride.
 *
 * @param state - The rideshare state (will be mutated with evaluation)
 * @param completedRide - The ride that was just completed
 * @param modelId - Model ID to use for passenger agent
 * @returns The passenger's evaluation
 */
const evaluateRide = async (
  state: RideshareState,
  completedRide: ActiveRide,
  modelId = "anthropic/claude-sonnet-4.5"
): Promise<PassengerEvaluation> => {
  // Initialize evaluation storage on state
  const stateWithEval = state as StateWithEvaluation;
  stateWithEval._passengerEvaluation = {};

  const passenger = completedRide.request.passenger;
  const systemPrompt = createPassengerPrompt(passenger);
  const userPrompt = formatRideSummary(completedRide);

  try {
    const passengerAgent = new Agent({
      model: modelId,
      system: systemPrompt,
      tools: passengerTools,
      experimental_context: { state: stateWithEval, ride: completedRide },
      stopWhen: stepCountIs(3), // Max 3 steps
      onStepFinish: (step) => {
        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const tc of step.toolCalls) {
            console.log(`     [Passenger] Tool: ${tc.toolName}`);
          }
        }
      },
    });

    await passengerAgent.generate({
      prompt: userPrompt,
    });

    const evaluation = stateWithEval._passengerEvaluation;

    // Ensure we have at least default values
    if (!evaluation.rating) {
      let baseRating = 4.0;
      if (passenger.mood === "cheerful") {
        baseRating = 4.5;
      } else if (passenger.mood === "irritated") {
        baseRating = 3.5;
      }
      evaluation.rating = {
        overallRating: Math.round(baseRating),
        punctuality: Math.round(baseRating),
        navigation: Math.round(baseRating),
        friendliness: Math.round(baseRating),
        cleanliness: Math.round(baseRating),
      };
    }

    if (evaluation.tipPercent === undefined) {
      let defaultTip = 15;
      if (passenger.tipTendency === "generous") {
        defaultTip = 20;
      } else if (passenger.tipTendency === "stingy") {
        defaultTip = 5;
      }
      evaluation.tipPercent = defaultTip;
      evaluation.tipReason = "Standard tip";
    }

    return evaluation;
  } catch (error) {
    console.error("Passenger agent error:", error);

    // Return default evaluation on error
    return {
      rating: {
        overallRating: 4,
        punctuality: 4,
        navigation: 4,
        friendliness: 4,
        cleanliness: 4,
      },
      tipPercent: 15,
      tipReason: "Default tip (agent error)",
    };
  }
};

export { evaluateRide };
export type { StateWithEvaluation };
