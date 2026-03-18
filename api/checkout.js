import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20"
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    if (!process.env.STRIPE_PRICE_ID) {
      return res.status(500).json({ error: "Missing STRIPE_PRICE_ID" });
    }

    const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;

    if (!rawSiteUrl) {
      return res.status(500).json({
        error: "Missing site URL environment variable."
      });
    }

    const siteUrl = rawSiteUrl.replace(/\/$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      client_reference_id: userId,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1
        }
      ],
      metadata: {
        userId
      },
      subscription_data: {
        metadata: {
          userId
        }
      },
      success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}&userId=${encodeURIComponent(userId)}`,
      cancel_url: `${siteUrl}/cancel.html`
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Checkout failed."
    });
  }
}
