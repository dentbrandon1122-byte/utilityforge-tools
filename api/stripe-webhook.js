import Stripe from "stripe";
import { buffer } from "micro";
import { markProUser } from "../lib/proStore.js";

export const config = {
  api: {
    bodyParser: false
  }
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  let event;

  try {
    const buf = await buffer(req);
    const signature = req.headers["stripe-signature"];

    event = stripe.webhooks.constructEvent(
      buf,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "invoice.payment_succeeded"
    ) {
      const object = event.data.object;

      const userId =
        object?.metadata?.userId ||
        object?.subscription_details?.metadata?.userId ||
        object?.lines?.data?.[0]?.metadata?.userId;

      if (userId) {
        await markProUser(userId);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Webhook processing failed."
    });
  }
}
