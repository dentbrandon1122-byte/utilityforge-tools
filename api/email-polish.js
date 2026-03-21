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

    const tonePromptMap = {
      professional: "Rewrite this email in a professional tone.",
      friendly: "Rewrite this email in a friendly and polished tone.",
      confident: "Rewrite this email in a confident and polished tone.",
      concise: "Rewrite this email in a concise and clear tone."
    };

    const prompt = `${tonePromptMap[tone] || tonePromptMap.professional}\n\nEmail:\n${input}`;

    const result = await runOpenAIText({
      system:
        "You improve rough emails. Keep the original meaning intact while making the writing clearer, smoother, and more polished. Return only the rewritten email.",
      userText: prompt
    });

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("Email polisher returned an empty result.");
    }

    return res.status(200).json({
      result: result.trim(),
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
