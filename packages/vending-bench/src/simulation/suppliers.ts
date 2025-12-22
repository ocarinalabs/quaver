/**
 * Supplier Simulation
 *
 * Uses a supplier agent to process customer emails and handle orders.
 * Based on Vending-Bench paper: "every wholesaler e-mail that actually exists
 * in the real world creates an AI-generated reply"
 */

import { AGENT_EMAIL, STORAGE_ADDRESS } from "@vending/config/constants.js";
import type { VendingState } from "@vending/core/types.js";
import { processCustomerEmail } from "./supplier-agent.js";

/**
 * Process outgoing emails from agent using supplier agent
 *
 * Called during advanceDay() to simulate overnight email processing.
 * Each unprocessed outgoing email is processed by the supplier agent.
 */
export const processSupplierEmails = async (
  state: VendingState
): Promise<number> => {
  const outgoingEmails = state.emails.filter(
    (e) => e.from === AGENT_EMAIL && !state.processedEmailIds.has(e.id)
  );

  // Log status
  console.log("\n📧 [Overnight] Email processing:");
  console.log(`   Total emails in system: ${state.emails.length}`);
  console.log(`   Unprocessed outgoing: ${outgoingEmails.length}`);
  console.log(`   Current balance: $${state.balance.toFixed(2)}`);

  if (outgoingEmails.length === 0) {
    console.log("   → Nothing to process");
    return 0;
  }

  let emailsProcessed = 0;

  for (const email of outgoingEmails) {
    state.processedEmailIds.add(email.id);
    console.log(`\n   → Processing email to: ${email.to}`);
    console.log(`     Subject: ${email.subject}`);

    // Use supplier agent to process the email
    await processCustomerEmail(state, email);
    emailsProcessed += 1;
  }

  console.log(`\n   ✅ Processed ${emailsProcessed} email(s)`);
  console.log(`   Balance after processing: $${state.balance.toFixed(2)}`);

  return emailsProcessed;
};

/**
 * Process pending orders and deliver items to storage
 *
 * Called during advanceDay() to check for orders ready for delivery.
 * Adds items to storage and sends delivery notification email.
 */
export const processDeliveries = (state: VendingState): number => {
  const dueOrders = state.pendingOrders.filter(
    (o) => !o.delivered && o.deliveryDay <= state.day
  );

  // Always log pending orders status
  const pendingCount = state.pendingOrders.filter((o) => !o.delivered).length;
  const deliveredCount = state.pendingOrders.filter((o) => o.delivered).length;
  const storageItems = state.storage.reduce((sum, s) => sum + s.quantity, 0);

  console.log("\n📦 [Overnight] Delivery status:");
  console.log(`   Pending orders: ${pendingCount}`);
  console.log(`   Delivered orders: ${deliveredCount}`);
  console.log(`   Items in storage: ${storageItems}`);

  if (pendingCount > 0) {
    for (const order of state.pendingOrders.filter((o) => !o.delivered)) {
      console.log(
        `   → From ${order.supplierEmail}: delivers Day ${order.deliveryDay} (${order.deliveryDay <= state.day ? "DUE TODAY" : `in ${order.deliveryDay - state.day} days`})`
      );
    }
  } else {
    console.log("   → No orders pending");
  }

  if (dueOrders.length === 0) {
    return 0;
  }

  console.log(`\n🚚 [Overnight] Delivering ${dueOrders.length} order(s)...`);

  for (const order of dueOrders) {
    const totalItems = order.items.reduce((sum, i) => sum + i.quantity, 0);
    console.log(
      `   → ${order.supplierEmail}: ${totalItems} units, $${order.totalPaid.toFixed(2)}`
    );

    for (const item of order.items) {
      const existing = state.storage.find(
        (s) => s.name === item.name && s.size === item.size
      );

      if (existing) {
        existing.quantity += item.quantity;
      } else {
        state.storage.push({
          name: item.name,
          quantity: item.quantity,
          costPerUnit: item.costPerUnit,
          size: item.size,
        });
      }
      console.log(`     + ${item.quantity}x ${item.name} (${item.size})`);
    }

    order.delivered = true;

    const itemList = order.items
      .map((i) => `- ${i.quantity}x ${i.name}`)
      .join("\n");

    state.emails.push({
      id: crypto.randomUUID(),
      from: order.supplierEmail,
      to: AGENT_EMAIL,
      subject: "Your order has been delivered",
      body: `Dear Customer,

Your order has been delivered to your storage facility at ${STORAGE_ADDRESS}.

Items delivered:
${itemList}

Total: $${order.totalPaid.toFixed(2)}

Thank you for your business!

Best regards,
${order.supplierEmail.split("@")[0]}`,
      timestamp: new Date(),
      read: false,
    });
  }

  // Log storage summary after deliveries
  const totalStorage = state.storage.reduce((sum, s) => sum + s.quantity, 0);
  console.log(`   ✅ Storage now has ${totalStorage} total items`);

  return dueOrders.length;
};
