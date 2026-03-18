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
      return res.status(400).json({ error: "Missing email text." });
    }

    const usage = await enforceUsageLimit(req, userId, "email", 5);

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
      systemPrompt: `You improve rough emails. Rewrite the user's email in a ${tone} tone. Keep the meaning, make it clearer, and return only the polished email.`,
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
    console.error("EMAIL POLISH ERROR:", error);
    return res.status(500).json({
      error: error.message || "Email polish failed."
    });
  }
}
