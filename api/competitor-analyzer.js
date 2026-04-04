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
      return res.status(400).json({ error: "Missing competitor details." });
    }

    const usage = await enforceUsageLimit(req, userId, "competitor-analyzer", 5);

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
        "Analyze this competitor and provide a practical review of their messaging, offer structure, positioning, strengths, weaknesses, and possible strategic advantages.",
      positioning:
        "Analyze this competitor with a positioning focus. Explain how they present themselves, what angle they are taking, how they differentiate, and where their positioning may be weak or unclear.",
      offers:
        "Analyze this competitor with an offer focus. Review their services, product framing, pricing angle if visible, offer structure, and perceived value.",
      messaging:
        "Analyze this competitor with a messaging and trust focus. Review tone, clarity, credibility, authority signals, trust-building elements, and persuasive strength."
    };

    const prompt = `${modePromptMap[mode] || modePromptMap.general}

Competitor details:
${input}

Format the response with clear sections:
1. Overall positioning
2. Strengths
3. Weak points
4. Offer observations
5. Trust and messaging observations
6. Opportunities to differentiate`;

    const result = await runOpenAIText({
      system:
        "You are a practical competitor analyst. Review competitor messaging, positioning, offer structure, trust signals, and strategic strengths or blind spots. Be specific, useful, and action-oriented. Return only the analysis.",
      userText: prompt
    });

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("Competitor analyzer returned an empty result.");
    }

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("COMPETITOR ANALYZER ERROR:", error);
    return res.status(500).json({
      error: error.message || "Competitor analysis failed."
    });
  }
}
