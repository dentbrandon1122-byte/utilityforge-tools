import Stripe from "stripe";
import { getRawBody } from "../../lib/raw-body";
import { clearPlanRecord, setPlanRecord } from "../../lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function buildRecordFromSubscription(uid, customerId, subscription) {
  const active = subscription.status === "active" || subscription.status === "trialing";

  return {
    uid,
    plan: active ? "pro" : "starter",
    status: subscription.status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    priceId: subscription.items?.data?.[0]?.price?.id || null,
    currentPeriodEnd: subscription.current_period_end || null,
    updatedAt: new Date().toISOString()
  };
}

async function handleCheckoutCompleted(session) {
  if (!session) return;

  const uid =
    session.metadata?.uid ||
    session.client_reference_id ||
    null;

  const customerId = session.customer || null;
  const subscriptionId = session.subscription || null;

  if (!uid || !customerId || !subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const record = buildRecordFromSubscription(uid, customerId, subscription);
  await setPlanRecord(uid, record);
}

async function handleSubscriptionChanged(subscription) {
  if (!subscription) return;

  const uid =
    subscription.metadata?.uid ||
    subscription.client_reference_id ||
    subscription.metadata?.userId ||
    null;

  const customerId = subscription.customer || null;

  if (!uid || !customerId) return;

  const record = buildRecordFromSubscription(uid, customerId, subscription);
  await setPlanRecord(uid, record);
}

async function handleSubscriptionDeleted(subscription) {
  if (!subscription) return;

  const uid =
    subscription.metadata?.uid ||
    subscription.client_reference_id ||
    subscription.metadata?.userId ||
    null;

  if (!uid) return;

  await clearPlanRecord(uid);
}

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return res.status(400).json({
        error: "Missing Stripe webhook signature or secret."
      });
    }

    const rawBody = await getRawBody(req);

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChanged(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(400).json({
      error: error?.message || "Webhook handling failed."
    });
  }
}
