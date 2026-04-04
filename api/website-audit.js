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
    console.log("WEBSITE_AUDIT start");

    const { text, mode = "general", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      console.log("WEBSITE_AUDIT missing input", Date.now() - startedAt);
      return res.status(400).json({ error: "Missing website details." });
    }

    console.log("WEBSITE_AUDIT before usage", Date.now() - startedAt);

    const usage = await enforceUsageLimit(req, userId, "website-audit", 5);

    console.log("WEBSITE_AUDIT after usage", Date.now() - startedAt);

    if (!usage.allowed) {
      console.log("WEBSITE_AUDIT blocked by usage", Date.now() - startedAt);
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

Keep the response practical, sharp, and easy to scan.

Format the response with these exact sections:
1. Quick diagnosis
2. Top 3 strengths
3. Top 3 weak points
4. SEO observations
5. Conversion observations
6. Quick action steps

Formatting rules:
- Use short bullet points under each section
- Avoid long paragraphs
- Include specific actionable suggestions, not just observations`;

    console.log("WEBSITE_AUDIT before openai", Date.now() - startedAt);

    const result = await runOpenAIText({
      system:
        "You are a practical website growth strategist. Review websites for clarity, messaging, SEO direction, trust, user experience, and conversion opportunities. Be specific, useful, and action-oriented. Focus on what the user should improve first. Return only the audit.",
      userText: prompt,
      maxTokens: 600
    });

    console.log("WEBSITE_AUDIT after openai", Date.now() - startedAt);

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("Website audit returned an empty result.");
    }

    console.log("WEBSITE_AUDIT success", Date.now() - startedAt);

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("WEBSITE AUDIT ERROR:", error);
    console.log("WEBSITE_AUDIT failed after", Date.now() - startedAt);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
}
