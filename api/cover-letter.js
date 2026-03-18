import { enforceUsageLimit } from "../lib/usage.js";
import { runOpenAIText } from "../lib/toolRunner.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, tone = "professional", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing cover letter notes." });
    }

    const usage = await enforceUsageLimit(req, userId, "cover-letter", 5);

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
      systemPrompt: `You write strong cover letters in a ${tone} tone. Use the user's details to write a polished cover letter draft. Return only the cover letter.`,
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
    console.error("COVER LETTER ERROR:", error);
    return res.status(500).json({
      error: error.message || "Cover letter generation failed."
    });
  }
}
