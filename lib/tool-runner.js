import { runOpenAI } from "./openai";
import { getOrCreateUid } from "./identity";
import { getPlanRecord, isProPlan } from "./plans";
import { canUseFreeTool, getFreeDailyLimit, getUsageCount, incrementUsage } from "./usage";

function badMethod(res) {
  return res.status(405).json({ error: "Method not allowed." });
}

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function serverError(res, error) {
  return res.status(500).json({
    error: error?.message || "Something went wrong."
  });
}

export async function handleToolRequest(req, res, config) {
  if (req.method !== "POST") {
    return badMethod(res);
  }

  try {
    const uid = getOrCreateUid(req, res);
    const planRecord = await getPlanRecord(uid);
    const isPro = isProPlan(planRecord);

    if (!isPro) {
      const allowed = await canUseFreeTool(uid);

      if (!allowed) {
        const used = await getUsageCount(uid);
        return res.status(429).json({
          error: "Daily limit reached. Upgrade to Pro for unlimited access.",
          plan: "starter",
          isPro: false,
          used,
          limit: getFreeDailyLimit()
        });
      }
    }

    const {
      buildPrompt,
      system,
      temperature = 0.7,
      maxTokens = 900,
      validate
    } = config;

    if (typeof validate === "function") {
      const validationMessage = validate(req.body || {});
      if (validationMessage) {
        return badRequest(res, validationMessage);
      }
    }

    const userPrompt = buildPrompt(req.body || {});
    const result = await runOpenAI({
      system,
      user: userPrompt,
      temperature,
      maxTokens
    });

    let used = await getUsageCount(uid);

    if (!isPro) {
      used = await incrementUsage(uid);
    }

    return res.status(200).json({
      result,
      plan: isPro ? "pro" : "starter",
      isPro,
      used,
      limit: isPro ? null : getFreeDailyLimit()
    });
  } catch (error) {
    return serverError(res, error);
  }
}
