import { generateText } from "./_lib/openai.js";
import { getUsageId, getUsageCount, incrementUsage } from "./_lib/usage.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { text, tone, userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Please enter an email draft." });
    }

    if (input.length > 1500) {
      return res.status(400).json({ error: "Input is too long. Limit: 1500 characters." });
    }

    const usageId = getUsageId(req, userId);
    const used = getUsageCount(usageId, "email");

    if (used >= 5) {
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage."
      });
    }

    const result = await generateText({
      system:
        "You rewrite rough emails into polished emails. Preserve intent, improve clarity, grammar, tone, and professionalism. Return only the final email text.",
      user: `Tone: ${tone || "professional"}\n\nDraft:\n${input}`,
      temperature: 0.6
    });

    incrementUsage(usageId, "email");

    return res.status(200).json({ result });
  } catch (error) {
    console.error("email-polish failed:", error);
    return res.status(500).json({ error: error.message || "A server error has occurred." });
  }
}
