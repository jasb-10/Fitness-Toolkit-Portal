import Stripe from "stripe";

let cachedKey: string | undefined;
let cachedClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    cachedKey = undefined;
    cachedClient = null;
    return null;
  }
  if (cachedClient && cachedKey === key) return cachedClient;
  cachedKey = key;
  cachedClient = new Stripe(key, { apiVersion: "2025-09-30.clover" as Stripe.LatestApiVersion });
  return cachedClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function probeStripe(): Promise<{
  configured: boolean;
  accountEmail: string | null;
  livemode: boolean | null;
  error: string | null;
}> {
  const stripe = getStripe();
  if (!stripe) {
    return { configured: false, accountEmail: null, livemode: null, error: null };
  }
  try {
    const account = await stripe.accounts.retrieve();
    return {
      configured: true,
      accountEmail: account.email ?? null,
      livemode: typeof account.charges_enabled === "boolean"
        ? !(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ?? false)
        : null,
      error: null,
    };
  } catch (err) {
    return {
      configured: true,
      accountEmail: null,
      livemode: null,
      error: err instanceof Error ? err.message : "Failed to reach Stripe",
    };
  }
}
