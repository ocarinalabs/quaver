// @ts-expect-error - convex-dev/stripe types not exported correctly
import stripe from "@convex-dev/stripe/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();

// Stripe payments, subscriptions, and billing
app.use(stripe);

export default app;
