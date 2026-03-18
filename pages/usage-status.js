import { getOrCreateUid } from "../../lib/identity";
import { getPlanRecord, isProPlan } from "../../lib/plans";
import { getFreeDailyLimit, getUsageCount } from "../../lib/usage";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const uid = getOrCreateUid(req, res);
    const planRecord = await getPlanRecord(uid);
    const isPro = isProPlan(planRecord);
    const used = isPro ? 0 : await getUsageCount(uid);

    return res.status(200).json({
      plan: isPro ? "pro" : "starter",
      isPro,
      used,
      limit: isPro ? null : getFreeDailyLimit(),
      customerId: planRecord?.stripeCustomerId || null,
      subscriptionId: planRecord?.stripeSubscriptionId || null,
      status: planRecord?.status || (isPro ? "active" : "starter")
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unable to load usage status."
    });
  }
}
