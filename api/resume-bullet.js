import { enforceUsageLimit } from "../lib/usage.js";
import { runOpenAIText } from "../lib/toolRunner.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, tone = "ats", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing job duties." });
    }

    const usage = await enforceUsageLimit(req, userId, "resume-bullet", 5);

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
      systemPrompt: `Turn plain job duties into strong resume bullet points. Style preference: ${tone}. Return only the bullet points.`,
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
    console.error("RESUME BULLET ERROR:", error);
    return res.status(500).json({
      error: error.message || "Resume bullet generation failed."
    });
  }
}
