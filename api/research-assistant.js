import { generateText } from "./_lib/openai.js";
import { getUsageId, getUsageCount, incrementUsage } from "./_lib/usage.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { text, style, userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Please enter a research topic." });
    }

    if (input.length > 3000) {
      return res.status(400).json({ error: "Input is too long. Limit: 3000 characters." });
    }

    const usageId = getUsageId(req, userId);
    const used = getUsageCount(usageId, "research");

    if (used >= 5) {
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage."
      });
    }

    const result = await generateText({
      system:
        "You are a research assistant. For general research, produce a structured overview with key points, open questions, and next steps. For legal research mode, produce a neutral research memo, not legal advice. In legal mode, clearly separate: issue, likely governing law area, jurisdiction notes, terms to verify, possible official sources to check, and practical next steps. Never pretend to verify current law if none was provided.",
      user: `Mode: ${style || "general"}\n\nResearch topic:\n${input}`,
      temperature: 0.5
    });

    incrementUsage(usageId, "research");

    return res.status(200).json({ result });
  } catch (error) {
    console.error("research-assistant failed:", error);
    return res.status(500).json({ error: error.message || "A server error has occurred." });
  }
}
