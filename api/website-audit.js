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
    const rawInput = typeof text === "string" ? text.trim() : "";
    const input = rawInput.slice(0, 1400);

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
        "Audit this website for clarity, messaging, SEO direction, trust, and conversion issues.",
      seo:
        "Audit this website with an SEO focus. Identify keyword direction issues, weak content areas, structure problems, and search visibility opportunities.",
      conversion:
        "Audit this website with a conversion focus. Identify weak calls to action, trust gaps, friction points, and offer clarity problems.",
      clarity:
        "Audit this website with a messaging focus. Identify confusing wording, weak positioning, unclear value, and places where the message should be simpler and stronger."
    };

    const prompt = `${modePromptMap[mode] || modePromptMap.general}

Website details:
${input}

Return the audit with these exact sections:
1. Quick diagnosis
2. Top strengths
3. Top weak points
4. SEO observations
5. Conversion observations
6. Quick action steps

Rules:
- Use short bullet points
- Keep each section concise
- Be specific
- Focus on the biggest improvements first
- Do not write long paragraphs`;

    console.log("WEBSITE_AUDIT before openai", Date.now() - startedAt);

    const result = await runOpenAIText({
      system:
        "You are a practical website growth strategist. Give clear, concise, high-value website audits focused on clarity, SEO, trust, and conversion. Prioritize speed, usefulness, and actionability. Return only the audit.",
      userText: prompt,
      maxTokens: 450,
      temperature: 0.5
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
