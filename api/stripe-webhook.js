import Stripe from "stripe";
import { buffer } from "micro";
import { markProUser } from "../lib/proStore.js";

export const config = {
  api: {
    bodyParser: false
  }
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20"
});

function getUserIdFromEventObject(obj) {
  if (!obj) return null;

  return (
    obj.metadata?.userId ||
    obj.client_reference_id ||
    obj.lines?.data?.[0]?.metadata?.userId ||
    null
  );
}

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
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = getUserIdFromEventObject(session);

        if (userId) {
          await markProUser(userId);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        let userId = getUserIdFromEventObject(invoice);

        if (!userId && invoice.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            userId = getUserIdFromEventObject(subscription);
          } catch (subError) {
            console.error("Subscription lookup error:", subError.message);
          }
        }

        if (userId) {
          await markProUser(userId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const userId = getUserIdFromEventObject(subscription);

        if (userId) {
          await markProUser(userId);
        }
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Webhook processing failed."
    });
  }
}
