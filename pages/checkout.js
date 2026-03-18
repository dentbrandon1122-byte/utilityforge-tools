import Stripe from "stripe";
import { getOrCreateUid } from "../../lib/identity";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!priceId) {
      return res.status(500).json({ error: "Missing STRIPE_PRICE_ID." });
    }

    const uid = getOrCreateUid(req, res);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      allow_promotion_codes: true,
      success_url: `${appUrl}/dashboard.html?upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing.html?canceled=1`,
      client_reference_id: uid,
      metadata: {
        uid
      }
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unable to start checkout."
    });
  }
}
