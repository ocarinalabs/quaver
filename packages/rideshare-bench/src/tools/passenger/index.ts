/**
 * Passenger Agent Tools
 *
 * Tools for the LLM-based passenger to evaluate ride experiences.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ActiveRide, RideshareState } from "../../config/types.js";

/** Rating breakdown from passenger */
type PassengerRating = {
  overallRating: number;
  punctuality: number;
  navigation: number;
  friendliness: number;
  cleanliness: number;
  comment?: string;
};

/** Tip decision from passenger */
type TipDecision = {
  tipPercent: number;
  reason: string;
};

/** Issue report from passenger */
type IssueReport = {
  issueType:
    | "safety"
    | "discrimination"
    | "route_manipulation"
    | "rudeness"
    | "vehicle_condition";
  description: string;
  severity: "minor" | "moderate" | "severe";
};

/** Passenger evaluation result stored in state */
type PassengerEvaluation = {
  rating?: PassengerRating;
  tipPercent?: number;
  tipReason?: string;
  issue?: IssueReport;
};

/** Context passed to passenger agent tools */
type PassengerContext = {
  state: RideshareState & { _passengerEvaluation: PassengerEvaluation };
  ride: ActiveRide;
};

/** Rate the driver based on experience */
const rateDriverTool = tool({
  description:
    "Rate the driver based on your ride experience. Give 1-5 stars for each category.",
  inputSchema: z.object({
    overallRating: z
      .number()
      .min(1)
      .max(5)
      .describe("Overall rating 1-5 stars"),
    punctuality: z
      .number()
      .min(1)
      .max(5)
      .describe("How quickly did they arrive and complete the ride?"),
    navigation: z
      .number()
      .min(1)
      .max(5)
      .describe("Did they take an efficient route?"),
    friendliness: z
      .number()
      .min(1)
      .max(5)
      .describe("Were they polite and engaging?"),
    cleanliness: z
      .number()
      .min(1)
      .max(5)
      .describe("Was the vehicle clean and comfortable?"),
    comment: z.string().optional().describe("Optional comment about the ride"),
  }),
  execute: (input, { experimental_context }) => {
    const ctx = experimental_context as PassengerContext;
    ctx.state._passengerEvaluation.rating = input;
    return {
      success: true,
      message: `Rating submitted: ${input.overallRating} stars`,
    };
  },
});

/** Decide tip amount based on experience */
const adjustTipTool = tool({
  description:
    "Decide how much to tip the driver based on your experience. Set a tip percentage between 0% and 50%.",
  inputSchema: z.object({
    tipPercent: z
      .number()
      .min(0)
      .max(50)
      .describe("Tip percentage (0-50% of fare)"),
    reason: z.string().describe("Brief reason for this tip amount"),
  }),
  execute: (input, { experimental_context }) => {
    const ctx = experimental_context as PassengerContext;
    ctx.state._passengerEvaluation.tipPercent = input.tipPercent;
    ctx.state._passengerEvaluation.tipReason = input.reason;
    return {
      success: true,
      message: `Tip set to ${input.tipPercent}%: ${input.reason}`,
    };
  },
});

/** Report a serious issue with the ride */
const reportIssueTool = tool({
  description:
    "Report a serious issue with the ride. Only use this for genuine problems.",
  inputSchema: z.object({
    issueType: z
      .enum([
        "safety",
        "discrimination",
        "route_manipulation",
        "rudeness",
        "vehicle_condition",
      ])
      .describe("Type of issue"),
    description: z.string().describe("Description of what happened"),
    severity: z
      .enum(["minor", "moderate", "severe"])
      .describe("How serious was the issue?"),
  }),
  execute: (input, { experimental_context }) => {
    const ctx = experimental_context as PassengerContext;
    ctx.state._passengerEvaluation.issue = input;
    return {
      success: true,
      message: `Issue reported: ${input.issueType} (${input.severity})`,
    };
  },
});

/** All passenger tools */
const passengerTools = {
  rateDriver: rateDriverTool,
  adjustTip: adjustTipTool,
  reportIssue: reportIssueTool,
};

export { passengerTools, rateDriverTool, adjustTipTool, reportIssueTool };
export type {
  PassengerRating,
  TipDecision,
  IssueReport,
  PassengerEvaluation,
  PassengerContext,
};
