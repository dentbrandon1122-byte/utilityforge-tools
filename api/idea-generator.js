import { generateText } from "./_lib/openai.js";
import { getUsageId, getUsageCount, incrementUsage } from "./_lib/usage.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { prompt, userId } = req.body || {};
    const input = typeof prompt === "string" ? prompt.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Please enter a prompt." });
    }

    if (input.length > 1500) {
      return res.status(400).json({ error: "Input is too long. Limit: 1500 characters." });
    }

    const usageId = getUsageId(req, userId);
    const used = getUsageCount(usageId, "idea");

    if (used >= 5) {
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage."
      });
    }

    const result = await generateText({
      system:
        "You generate practical, useful ideas. Return a clean numbered list with short explanations. Be specific and realistic.",
      user: `Generate useful ideas for this prompt:\n\n${input}`,
      temperature: 0.8
    });

    incrementUsage(usageId, "idea");

    return res.status(200).json({ result });
  } catch (error) {
    console.error("idea-generator failed:", error);
    return res.status(500).json({ error: error.message || "A server error has occurred." });
  }
}
