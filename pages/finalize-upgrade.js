import Stripe from "stripe";
import { getOrCreateUid } from "../../lib/identity";
import { setPlanRecord } from "../../lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function isActiveSubscription(status) {
  return status === "active" || status === "trialing";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const uid = getOrCreateUid(req, res);
    const sessionId = String(req.body?.sessionId || "").trim();

    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId." });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"]
    });

    if (!session) {
      return res.status(404).json({ error: "Checkout session not found." });
    }

    const sessionUid =
      session.metadata?.uid ||
      session.client_reference_id ||
      "";

    if (sessionUid && sessionUid !== uid) {
      return res.status(403).json({ error: "Session does not match current user." });
    }

    const subscription =
      typeof session.subscription === "object"
        ? session.subscription
        : session.subscription
        ? await stripe.subscriptions.retrieve(session.subscription)
        : null;

    const customerId =
      typeof session.customer === "object"
        ? session.customer.id
        : session.customer || null;

    if (!subscription || !customerId) {
      return res.status(400).json({
        error: "No active subscription was found on this checkout session."
      });
    }

    const record = {
      uid,
      plan: isActiveSubscription(subscription.status) ? "pro" : "starter",
      status: subscription.status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      priceId: subscription.items?.data?.[0]?.price?.id || null,
      currentPeriodEnd: subscription.current_period_end || null,
      updatedAt: new Date().toISOString()
    };

    await setPlanRecord(uid, record);

    return res.status(200).json({
      ok: true,
      plan: record.plan,
      status: record.status
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unable to finalize upgrade."
    });
  }
}
