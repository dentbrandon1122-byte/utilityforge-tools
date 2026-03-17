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
      return res.status(400).json({ error: "Please enter job duties." });
    }

    if (input.length > 1800) {
      return res.status(400).json({ error: "Input is too long. Limit: 1800 characters." });
    }

    const usageId = getUsageId(req, userId);
    const used = getUsageCount(usageId, "resume");

    if (used >= 5) {
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage."
      });
    }

    const result = await generateText({
      system:
        "You transform plain job duties into strong resume bullet points. Use action verbs, sound professional, and keep results ATS-friendly. Return bullet points only.",
      user: `Style: ${style || "professional"}\n\nTurn these duties into resume bullets:\n${input}`,
      temperature: 0.6
    });

    incrementUsage(usageId, "resume");

    return res.status(200).json({ result });
  } catch (error) {
    console.error("resume-bullet failed:", error);
    return res.status(500).json({ error: error.message || "A server error has occurred." });
  }
}
