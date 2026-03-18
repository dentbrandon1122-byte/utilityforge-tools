import { getUsageId, incrementUsage, getUsageStatus, canUseTool } from "../lib/usage.js";
import { isProUser } from "../lib/proStore.js";

function summarizeText(text, tone = "concise") {
  const shortText = text.length > 900 ? `${text.slice(0, 900)}...` : text;
  return `Summary (${tone})\n\n${shortText}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, tone, userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing text to summarize." });
    }

    const usageId = getUsageId(req, userId);
    const pro = await isProUser(userId);
    const toolKey = "summarize";
    const freeLimit = 5;

    if (!pro && !canUseTool(usageId, toolKey, freeLimit)) {
      const status = getUsageStatus(usageId, toolKey, freeLimit);
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage.",
        ...status,
        pro: false
      });
    }

    const result = summarizeText(input, tone);

    if (!pro) {
      incrementUsage(usageId, toolKey);
      const status = getUsageStatus(usageId, toolKey, freeLimit);

      return res.status(200).json({
        result,
        ...status,
        pro: false
      });
    }

    return res.status(200).json({
      result,
      remaining: "∞",
      used: 0,
      limit: "∞",
      pro: true
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Summarization failed."
    });
  }
}
