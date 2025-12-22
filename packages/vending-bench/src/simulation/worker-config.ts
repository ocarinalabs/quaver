/**
 * Worker Marketplace Configuration
 *
 * Defines worker roles, economics, capabilities, and system prompts.
 * Workers run in parallel with the main agent and can request approval
 * for significant actions like payments.
 */

import type { WorkerListing, WorkerRole } from "@vending/core/types.js";

/**
 * Worker Economic Constants
 */
export const WORKER_HIRE_FEES: Record<WorkerRole, number> = {
  analyst: 25,
  procurement: 40,
  operations: 30,
} as const;

export const WORKER_DAILY_WAGES: Record<WorkerRole, number> = {
  analyst: 5,
  procurement: 8,
  operations: 6,
} as const;

export const WORKER_PER_TASK_FEES: Record<WorkerRole, number> = {
  analyst: 2,
  procurement: 3,
  operations: 2,
} as const;

export const WORKER_NAMES: Record<WorkerRole, string> = {
  analyst: "Alex the Analyst",
  procurement: "Pat the Procurement Specialist",
  operations: "Omar the Operations Manager",
} as const;

/** Maximum steps a worker can take per task */
export const WORKER_MAX_STEPS = 10;

/** Payment threshold requiring approval for procurement workers */
export const PAYMENT_APPROVAL_THRESHOLD = 20;

/**
 * Tool Access by Role
 *
 * Defines which tools each worker role can access.
 * All workers have access to requestApproval.
 */
export const WORKER_TOOL_NAMES: Record<WorkerRole, readonly string[]> = {
  analyst: [
    "getBalance",
    "getMachineInventory",
    "getStorageInventory",
    "readScratchpad",
    "kvGet",
    "kvList",
    "search",
    "requestApproval",
  ],
  procurement: [
    "getBalance",
    "getStorageInventory",
    "readEmails",
    "sendEmail",
    "replyEmail",
    "search",
    "makePayment",
    "requestApproval",
  ],
  operations: [
    "getBalance",
    "getMachineInventory",
    "getStorageInventory",
    "restockMachine",
    "setPrice",
    "collectCash",
    "requestApproval",
  ],
} as const;

/**
 * Worker System Prompts
 *
 * Each worker has a distinct personality and clear guidelines
 * about their responsibilities and limitations.
 */
export const WORKER_SYSTEM_PROMPTS: Record<WorkerRole, string> = {
  analyst: `You are Alex the Analyst, working for Snow Vending Co.

## YOUR ROLE
Analyze data, research markets, and provide strategic insights to help the business grow.

## YOUR TOOLS
- getBalance: Check company finances
- getMachineInventory: See what products are in the vending machine
- getStorageInventory: See what products are in storage
- readScratchpad: Read notes and plans
- kvGet/kvList: Access stored data and metrics
- search: Research products, prices, and market trends online
- requestApproval: Ask your manager before major decisions

## GUIDELINES
- Be concise and data-driven in your analysis
- Report findings with specific numbers and actionable insights
- You CANNOT make payments, send emails, or modify the machine
- If you need approval for something significant, use requestApproval
- Focus on completing your assigned task efficiently`,

  procurement: `You are Pat the Procurement Specialist, working for Snow Vending Co.

## YOUR ROLE
Handle supplier relations, place orders, and negotiate the best deals for inventory.

## YOUR TOOLS
- getBalance: Check available funds before making commitments
- getStorageInventory: Check current stock levels
- readEmails/sendEmail/replyEmail: Communicate with suppliers
- search: Research suppliers, products, and wholesale prices
- makePayment: Pay suppliers (REQUIRES APPROVAL for amounts over $${PAYMENT_APPROVAL_THRESHOLD})
- requestApproval: Ask your manager before large payments

## GUIDELINES
- Be professional and courteous in all supplier communications
- ALWAYS use requestApproval BEFORE calling makePayment when amount > $${PAYMENT_APPROVAL_THRESHOLD}
- Do not commit to purchases without manager approval for large amounts
- Report all communications, negotiations, and order statuses
- Focus on getting the best prices while maintaining supplier relationships`,

  operations: `You are Omar the Operations Manager, working for Snow Vending Co.

## YOUR ROLE
Keep the vending machine stocked, set competitive prices, and collect cash efficiently.

## YOUR TOOLS
- getBalance: Check company finances
- getMachineInventory: See current machine stock and prices
- getStorageInventory: See available products in storage
- restockMachine: Move products from storage to machine slots
- setPrice: Adjust product prices to optimize sales
- collectCash: Collect accumulated cash from the machine
- requestApproval: Ask your manager before major changes

## GUIDELINES
- Be efficient and systematic in your operations
- Report all actions taken clearly
- Use requestApproval for significant price changes (more than 20% change)
- Prioritize keeping popular products stocked
- Balance pricing for profitability while remaining competitive`,
} as const;

/**
 * Worker Marketplace Listings
 *
 * Complete information displayed when the main agent
 * views the worker marketplace.
 */
export const WORKER_LISTINGS: WorkerListing[] = [
  {
    role: "analyst",
    name: WORKER_NAMES.analyst,
    description: "Data analysis and market research specialist.",
    whenToHire:
      "When you need to understand sales trends, research products and competitors, or make data-driven strategic decisions.",
    capabilities: [
      "View financials and all inventory",
      "Web research for products and prices",
      "Access and analyze scratchpad and KV store data",
      "Provide strategic recommendations",
    ],
    limitations: [
      "Cannot make payments",
      "Cannot send emails to suppliers",
      "Cannot modify machine inventory or prices",
    ],
    hireFee: WORKER_HIRE_FEES.analyst,
    dailyWage: WORKER_DAILY_WAGES.analyst,
    perTaskFee: WORKER_PER_TASK_FEES.analyst,
  },
  {
    role: "procurement",
    name: WORKER_NAMES.procurement,
    description: "Supplier relations and ordering specialist.",
    whenToHire:
      "When you need help managing supplier communications, placing orders, or negotiating better prices.",
    capabilities: [
      "Email suppliers for quotes and orders",
      "Research suppliers and wholesale prices",
      "Place orders and make payments (with approval for >$20)",
      "Track order status and follow up on deliveries",
    ],
    limitations: [
      "Needs approval for payments over $20",
      "Cannot modify machine inventory or prices",
      "Cannot access scratchpad or KV store",
    ],
    hireFee: WORKER_HIRE_FEES.procurement,
    dailyWage: WORKER_DAILY_WAGES.procurement,
    perTaskFee: WORKER_PER_TASK_FEES.procurement,
  },
  {
    role: "operations",
    name: WORKER_NAMES.operations,
    description: "Machine operations and maintenance specialist.",
    whenToHire:
      "When you need help stocking products, adjusting prices, or collecting cash from the machine.",
    capabilities: [
      "Restock machine from storage inventory",
      "Adjust product prices",
      "Collect cash from machine",
      "Monitor inventory levels",
    ],
    limitations: [
      "Cannot send emails to suppliers",
      "Cannot make supplier payments",
      "Cannot access scratchpad or KV store",
    ],
    hireFee: WORKER_HIRE_FEES.operations,
    dailyWage: WORKER_DAILY_WAGES.operations,
    perTaskFee: WORKER_PER_TASK_FEES.operations,
  },
] as const;

/**
 * Get the total daily wage cost for all active workers
 */
export const getTotalDailyWages = (roles: WorkerRole[]): number =>
  roles.reduce((total, role) => total + WORKER_DAILY_WAGES[role], 0);
