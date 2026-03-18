import { enforceUsageLimit } from "../lib/usage.js";
import { runOpenAIText } from "../lib/toolRunner.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, tone = "concise", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing text to summarize." });
    }

    const usage = await enforceUsageLimit(req, userId, "summarize", 5);

    if (!usage.allowed) {
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage.",
        pro: false,
        used: usage.used,
        remaining: usage.remaining,
        limit: usage.limit
      });
    }

    const result = await runOpenAIText({
      systemPrompt: `Summarize the user's text in a ${tone} style. Return a clear, readable summary only.`,
      userText: input
    });

    return res.status(200).json({
      result,
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("SUMMARIZE ERROR:", error);
    return res.status(500).json({
      error: error.message || "Summarization failed."
    });
  }
}
