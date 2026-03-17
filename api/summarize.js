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
      return res.status(400).json({ error: "Please enter text to summarize." });
    }

    if (input.length > 2500) {
      return res.status(400).json({ error: "Input is too long. Limit: 2500 characters." });
    }

    const usageId = getUsageId(req, userId);
    const used = getUsageCount(usageId, "summarize");

    if (used >= 5) {
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage."
      });
    }

    const result = await generateText({
      system:
        "You summarize text clearly and accurately. Keep the meaning intact and match the requested summary style.",
      user: `Summary style: ${style || "clear"}\n\nSummarize this text:\n${input}`,
      temperature: 0.5
    });

    incrementUsage(usageId, "summarize");

    return res.status(200).json({ result });
  } catch (error) {
    console.error("summarize failed:", error);
    return res.status(500).json({ error: error.message || "A server error has occurred." });
  }
}
