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
      return res.status(400).json({ error: "Please enter outreach context." });
    }

    if (input.length > 2000) {
      return res.status(400).json({ error: "Input is too long. Limit: 2000 characters." });
    }

    const usageId = getUsageId(req, userId);
    const used = getUsageCount(usageId, "coldemail");

    if (used >= 5) {
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage."
      });
    }

    const result = await generateText({
      system:
        "You write concise, effective cold emails for networking, opportunities, and outreach. Keep them clear, human, and not overly pushy. Return only the finished email.",
      user: `Style: ${style || "professional"}\n\nWrite a cold email from this context:\n${input}`,
      temperature: 0.7
    });

    incrementUsage(usageId, "coldemail");

    return res.status(200).json({ result });
  } catch (error) {
    console.error("cold-email failed:", error);
    return res.status(500).json({ error: error.message || "A server error has occurred." });
  }
}
