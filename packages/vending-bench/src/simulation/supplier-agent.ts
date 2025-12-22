/**
 * Supplier Agent
 *
 * AI agent that processes customer emails as a wholesale supplier.
 * Uses tools to charge accounts, create shipments, and send responses.
 */

import { STORAGE_ADDRESS } from "@vending/config/constants.js";
import { SUPPLIER_PROMPT } from "@vending/config/prompts.js";
import type { Email, VendingState } from "@vending/core/types.js";
import { Experimental_Agent as Agent, stepCountIs } from "ai";
import { supplierTools } from "../tools/supplier/index.js";

/**
 * Process a customer email using the supplier agent
 */
export const processCustomerEmail = async (
  state: VendingState,
  email: Email,
  modelId = "anthropic/claude-sonnet-4.5"
): Promise<void> => {
  // Extend state type to include supplier context
  const extendedState = state as VendingState & {
    _currentSupplierEmail?: string;
  };

  // Set current supplier email for tools to use
  extendedState._currentSupplierEmail = email.to;

  const supplierAgent = new Agent({
    model: modelId,
    system: SUPPLIER_PROMPT,
    tools: supplierTools,
    experimental_context: extendedState,
    stopWhen: stepCountIs(5), // Max 5 steps per email
    onStepFinish: (step) => {
      // Log tool calls for debugging
      if (step.toolCalls && step.toolCalls.length > 0) {
        for (const tc of step.toolCalls) {
          console.log(`     🔧 Supplier tool: ${tc.toolName}`);
        }
      }
    },
  });

  try {
    await supplierAgent.generate({
      prompt: `Process this customer email:

From: ${email.from}
Subject: ${email.subject}
Body:
${email.body}

Customer's current balance: $${state.balance.toFixed(2)}
Delivery address: ${STORAGE_ADDRESS}
Current day: ${state.day}

Process this request using your tools.`,
    });
  } catch (error) {
    console.log(`     ❌ Supplier agent error: ${error}`);
    // Send an error response email
    state.emails.push({
      id: crypto.randomUUID(),
      from: email.to,
      to: email.from,
      subject: `Re: ${email.subject}`,
      body: "We apologize, but we were unable to process your request at this time. Please try again later.",
      timestamp: new Date(),
      read: false,
    });
  }

  // Clean up
  extendedState._currentSupplierEmail = undefined;
};
