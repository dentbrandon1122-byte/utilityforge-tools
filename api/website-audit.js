import { enforceUsageLimit } from "../lib/usage.js";
import { runOpenAIText } from "../lib/toolRunner.js";

export const config = {
  maxDuration: 30
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, mode = "general", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing website details." });
    }

    const usage = await enforceUsageLimit(req, userId, "website-audit", 5);

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
        "Analyze this website and provide a practical audit covering clarity, messaging, SEO direction, trust signals, user experience, and conversion opportunities.",
      seo:
        "Analyze this website with an SEO focus. Identify content weaknesses, keyword direction issues, structural SEO opportunities, and ways to improve search visibility.",
      conversion:
        "Analyze this website with a conversion focus. Identify weak calls to action, trust issues, friction points, offer clarity problems, and ways to improve lead generation or sales flow.",
      clarity:
        "Analyze this website with a messaging and clarity focus. Identify confusing wording, weak positioning, unclear value, and ways to make the message stronger and easier to understand."
    };

    const prompt = `${modePromptMap[mode] || modePromptMap.general}

Website details:
${input}

Keep the audit concise, practical, and easy to scan.

Format the response with clear sections:
1. Overall impression
2. Strengths
3. Weak points
4. SEO observations
5. Conversion observations
6. Recommended improvements`;

    const result = await runOpenAIText({
      system:
        "You are a practical website growth analyst. Review websites for clarity, messaging, SEO direction, trust, user experience, and conversion opportunities. Be specific, useful, and action-oriented. Return only the audit.",
      userText: prompt,
      maxTokens: 550
    });

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("Website audit returned an empty result.");
    }

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("WEBSITE AUDIT ERROR:", error);
    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
}
