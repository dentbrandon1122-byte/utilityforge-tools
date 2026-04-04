import { enforceUsageLimit } from "../lib/usage.js";
import { runOpenAIText } from "../lib/toolRunner.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, mode = "conversion", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing landing page copy." });
    }

    const usage = await enforceUsageLimit(req, userId, "landing-page-rewriter", 5);

    if (!usage.allowed) {
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage.",
        pro: false,
        used: usage.used,
        remaining: usage.remaining,
        limit: usage.limit
      });
    }

    const modePromptMap = {
      conversion:
        "Rewrite this landing page copy to improve conversion potential, calls to action, clarity, and overall persuasive strength.",
      clarity:
        "Rewrite this landing page copy to make it clearer, easier to understand, and more direct without losing the core message.",
      positioning:
        "Rewrite this landing page copy to improve offer positioning, value communication, and perceived differentiation.",
      trust:
        "Rewrite this landing page copy to improve trust, credibility, professionalism, and confidence."
    };

    const prompt = `${modePromptMap[mode] || modePromptMap.conversion}

Landing page copy:
${input}

Return the rewritten copy in a clean, usable format. Keep it practical, stronger, and more polished.`;

    const result = await runOpenAIText({
      system:
        "You are a landing page copywriter focused on clarity, positioning, trust, and conversion. Rewrite weak or rough landing page copy into stronger, cleaner, more effective messaging. Return only the rewritten copy.",
      userText: prompt,
      maxTokens: 900
    });

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("Landing page rewriter returned an empty result.");
    }

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("LANDING PAGE REWRITER ERROR:", error);
    return res.status(500).json({
      error: error.message || "Landing page rewrite failed."
    });
  }
}
