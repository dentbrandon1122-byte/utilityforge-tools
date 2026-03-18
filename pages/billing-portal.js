import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const customerId = req.body?.customerId || req.headers["x-stripe-customer-id"];

    if (!customerId) {
      return res.status(400).json({
        error: "Missing Stripe customer ID."
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
