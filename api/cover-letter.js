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
      return res.status(400).json({ error: "Please enter your background or job notes." });
    }

    if (input.length > 2200) {
      return res.status(400).json({ error: "Input is too long. Limit: 2200 characters." });
    }

    const usageId = getUsageId(req, userId);
    const used = getUsageCount(usageId, "cover");

    if (used >= 5) {
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage."
      });
    }

    const result = await generateText({
      system:
        "You write polished cover letters from rough job notes. Make the letter professional, specific, and readable. Return only the finished cover letter.",
      user: `Style: ${style || "professional"}\n\nCreate a cover letter from these notes:\n${input}`,
      temperature: 0.7
    });

    incrementUsage(usageId, "cover");

    return res.status(200).json({ result });
  } catch (error) {
    console.error("cover-letter failed:", error);
    return res.status(500).json({ error: error.message || "A server error has occurred." });
  }
}
