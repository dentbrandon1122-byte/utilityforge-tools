import { enforceUsageLimit } from "../lib/usage.js";
import { runOpenAIText } from "../lib/toolRunner.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, mode = "professional", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing resume bullet input." });
    }

    const usage = await enforceUsageLimit(req, userId, "resume", 5);

    if (!usage.allowed) {
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage.",
        pro: false,
        used: usage.used,
        remaining: usage.remaining,
        limit: usage.limit
      });
    }

    const promptMap = {
      professional: `Turn these job duties into polished professional resume bullet points.\n\nDuties:\n${input}`,
      ats: `Turn these job duties into ATS-friendly resume bullet points with strong keywords and clear language.\n\nDuties:\n${input}`,
      impact: `Turn these job duties into impact-driven resume bullet points that sound strong and valuable.\n\nDuties:\n${input}`,
      concise: `Turn these job duties into concise, clean resume bullet points.\n\nDuties:\n${input}`
    };

    const result = await runOpenAIText({
      system:
        "You write strong resume bullet points. Return clean bullet points only, with no intro or outro text.",
      userText: promptMap[mode] || promptMap.professional
    });

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("Resume bullet generator returned an empty result.");
    }

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("RESUME BULLET ERROR:", error);
    return res.status(500).json({
      error: error.message || "Resume bullet generation failed."
    });
  }
}
