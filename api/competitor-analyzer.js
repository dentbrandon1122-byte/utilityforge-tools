import { enforceUsageLimit } from "../lib/usage.js";
import { runOpenAIText } from "../lib/toolRunner.js";

export const config = {
  maxDuration: 30
};

export default async function handler(req, res) {
  const startedAt = Date.now();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("COMPETITOR_ANALYZER start");

    const { text, mode = "general", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      console.log("COMPETITOR_ANALYZER missing input", Date.now() - startedAt);
      return res.status(400).json({ error: "Missing competitor details." });
    }

    console.log("COMPETITOR_ANALYZER before usage", Date.now() - startedAt);

    const usage = await enforceUsageLimit(req, userId, "competitor-analyzer", 5);

    console.log("COMPETITOR_ANALYZER after usage", Date.now() - startedAt);

    if (!usage.allowed) {
      console.log("COMPETITOR_ANALYZER blocked by usage", Date.now() - startedAt);
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

Keep the response practical, sharp, and easy to scan.

Format the response with these exact sections:
1. Quick diagnosis
2. Top 3 strengths
3. Top 3 weaknesses
4. Positioning and offer observations
5. Biggest differentiation opportunities
6. Quick action steps`;

    console.log("COMPETITOR_ANALYZER before openai", Date.now() - startedAt);

    const result = await runOpenAIText({
      system:
        "You are a practical competitor strategist. Analyze competitor positioning, messaging, offer structure, trust signals, and strategic gaps. Be specific, useful, and action-oriented. Prefer direct observations over fluff. Return only the analysis.",
      userText: prompt,
      maxTokens: 550
    });

    console.log("COMPETITOR_ANALYZER after openai", Date.now() - startedAt);

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("Competitor analyzer returned an empty result.");
    }

    console.log("COMPETITOR_ANALYZER success", Date.now() - startedAt);

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("COMPETITOR ANALYZER ERROR:", error);
    console.log("COMPETITOR_ANALYZER failed after", Date.now() - startedAt);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
}
