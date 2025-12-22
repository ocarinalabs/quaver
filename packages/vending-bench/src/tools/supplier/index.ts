/**
 * Supplier Tools
 *
 * Tools for the supplier agent to process customer orders.
 * The supplier can charge accounts, create shipments, and send responses.
 */

import { AGENT_EMAIL, STORAGE_ADDRESS } from "@vending/config/constants.js";
import type { VendingState } from "@vending/core/types.js";
import { tool } from "ai";
import { z } from "zod";

const DELIVERY_DAYS = 3;

/**
 * Charge the customer's account for an order
 */
export const chargeAccountTool = tool({
  description:
    "Charge the customer's account for an order. Use this when confirming an order.",
  inputSchema: z.object({
    amount: z.number().positive().describe("Amount to charge in dollars"),
    orderDescription: z
      .string()
      .describe("Description of what this charge is for"),
  }),
  execute: ({ amount, orderDescription }, { experimental_context }) => {
    const state = experimental_context as VendingState & {
      _currentSupplierEmail?: string;
    };

    if (amount > state.balance) {
      return {
        success: false,
        error: `Customer has insufficient funds. Balance: $${state.balance.toFixed(2)}`,
      };
    }

    state.balance -= amount;
    state.transactions.push({
      id: crypto.randomUUID(),
      type: "payment",
      amount,
      description: `Supplier charge: ${orderDescription}`,
      timestamp: new Date(),
    });

    console.log(`     💳 CHARGED: $${amount.toFixed(2)} - ${orderDescription}`);

    return {
      success: true,
      charged: amount,
      newCustomerBalance: state.balance,
    };
  },
});

/**
 * Create a shipment for delivery to customer's storage
 */
export const createShipmentTool = tool({
  description:
    "Create a shipment to deliver items to the customer's storage facility.",
  inputSchema: z.object({
    items: z.array(
      z.object({
        name: z.string().describe("Product name"),
        quantity: z.number().describe("Quantity to ship"),
        costPerUnit: z.number().describe("Cost per unit in dollars"),
        size: z
          .enum(["small", "large"])
          .describe("small for snacks/candy, large for drinks/beverages"),
      })
    ),
    totalAmount: z.number().describe("Total order amount"),
  }),
  execute: ({ items, totalAmount }, { experimental_context }) => {
    const state = experimental_context as VendingState & {
      _currentSupplierEmail?: string;
    };
    const supplierEmail = state._currentSupplierEmail ?? "unknown@supplier.com";

    state.pendingOrders.push({
      id: crypto.randomUUID(),
      supplierEmail,
      items,
      totalPaid: totalAmount,
      orderDay: state.day,
      deliveryDay: state.day + DELIVERY_DAYS,
      delivered: false,
    });

    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    console.log(
      `     📦 SHIPMENT CREATED: ${totalItems} items, $${totalAmount.toFixed(2)}, delivers Day ${state.day + DELIVERY_DAYS}`
    );

    return {
      success: true,
      deliveryDay: state.day + DELIVERY_DAYS,
      deliveryAddress: STORAGE_ADDRESS,
    };
  },
});

/**
 * Send a response email to the customer
 */
export const sendResponseTool = tool({
  description:
    "Send a response email to the customer about their order inquiry.",
  inputSchema: z.object({
    subject: z.string().describe("Email subject line"),
    body: z.string().describe("Email body content"),
  }),
  execute: ({ subject, body }, { experimental_context }) => {
    const state = experimental_context as VendingState & {
      _currentSupplierEmail?: string;
    };
    const supplierEmail = state._currentSupplierEmail ?? "unknown@supplier.com";

    state.emails.push({
      id: crypto.randomUUID(),
      from: supplierEmail,
      to: AGENT_EMAIL,
      subject,
      body,
      timestamp: new Date(),
      read: false,
    });

    console.log(`     📧 RESPONSE SENT: "${subject}"`);

    return { success: true, message: "Response sent" };
  },
});

export const supplierTools = {
  chargeAccount: chargeAccountTool,
  createShipment: createShipmentTool,
  sendResponse: sendResponseTool,
};
