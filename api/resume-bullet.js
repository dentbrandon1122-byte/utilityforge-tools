import { getUsageId, incrementUsage, getUsageStatus, canUseTool } from "../lib/usage.js";
import { isProUser } from "../lib/proStore.js";

function generateResumeBullets(text, tone = "ats") {
  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `• ${line}`);

  return `Resume Bullets (${tone})\n\n${lines.join("\n")}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, tone, userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing resume bullet input." });
    }

    const usageId = getUsageId(req, userId);
    const pro = await isProUser(userId);
    const toolKey = "resume-bullet";
    const freeLimit = 5;

    if (!pro && !canUseTool(usageId, toolKey, freeLimit)) {
      const status = getUsageStatus(usageId, toolKey, freeLimit);
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage.",
        ...status,
        pro: false
      });
    }

    const result = generateResumeBullets(input, tone);

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
      error: error.message || "Resume bullet generation failed."
    });
  }
}
