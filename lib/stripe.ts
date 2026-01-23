import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_123", {
    apiVersion: "2025-12-15.clover", // Updated to match type definition
    typescript: true,
});
