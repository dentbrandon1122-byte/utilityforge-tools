import { enforceUsageLimit } from "../lib/usage.js";
import { runOpenAIText } from "../lib/toolRunner.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, mode = "general", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing offer details." });
    }

    const usage = await enforceUsageLimit(req, userId, "offer-analyzer", 5);

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
      general:
        "Analyze this offer for clarity, value, positioning, pricing logic, and differentiation.",
      value:
        "Analyze this offer with a perceived value focus. Explain what feels strong, what feels weak, and what makes the value less obvious than it should be.",
      positioning:
        "Analyze this offer with a positioning focus. Explain how clearly it is framed, how differentiated it feels, and where the offer blends in too much.",
      pricing:
        "Analyze this offer with a pricing logic focus. Review whether the pricing seems aligned with the value, and explain what may create hesitation or confusion."
    };

    const prompt = `${modePromptMap[mode] || modePromptMap.general}

Offer details:
${input}

Format the response with clear sections:
1. Overall impression
2. Strengths
3. Weak points
4. Value perception
5. Differentiation
6. Recommended improvements`;

    const result = await runOpenAIText({
      system:
        "You are a practical business offer strategist. Review offers for clarity, value, positioning, differentiation, and pricing logic. Be specific, useful, and action-oriented. Return only the analysis.",
      userText: prompt,
      maxTokens: 600
    });

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("Offer analyzer returned an empty result.");
    }

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("OFFER ANALYZER ERROR:", error);
    return res.status(500).json({
      error: "The forge went out. Relight in a moment."
    });
  }
}
