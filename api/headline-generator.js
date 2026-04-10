import { enforceUsageLimit } from "../lib/usage.js";
import { runOpenAIText } from "../lib/toolRunner.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, mode = "clear", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing headline details." });
    }

    const usage = await enforceUsageLimit(req, userId, "headline-generator", 5);

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
      clear:
        "Generate 10 clear and direct headline options for this page or offer.",
      benefit:
        "Generate 10 benefit-driven headline options for this page or offer.",
      premium:
        "Generate 10 headline options that feel more premium, polished, and higher-value.",
      conversion:
        "Generate 10 headline options designed to feel stronger, more compelling, and more conversion-focused."
    };

    const prompt = `${modePromptMap[mode] || modePromptMap.clear}

Details:
${input}

Return the headlines as a clean numbered list.`;

    const result = await runOpenAIText({
      system:
        "You are a conversion-focused headline writer. Generate strong, clear, useful headline options for homepages, landing pages, service pages, and offers. Prioritize clarity, strength, usefulness, and realistic positioning. Return only the list of headlines.",
      userText: prompt,
      maxTokens: 700
    });

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("Headline generator returned an empty result.");
    }

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("HEADLINE GENERATOR ERROR:", error);
    return res.status(500).json({
      error: error.message || "The forge went out. Relight in a moment."
    });
  }
}
