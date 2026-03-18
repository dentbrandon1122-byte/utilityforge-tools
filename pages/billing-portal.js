import Stripe from "stripe";
import { getOrCreateUid } from "../../lib/identity";
import { getPlanRecord } from "../../lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const uid = getOrCreateUid(req, res);
    const planRecord = await getPlanRecord(uid);
    const customerId = planRecord?.stripeCustomerId;

    if (!customerId) {
      return res.status(400).json({
        error: "No Stripe customer was found for this account."
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard.html`
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unable to open billing portal."
    });
  }
}
