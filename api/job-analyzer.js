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
      return res.status(400).json({ error: "Please enter a job description." });
    }

    if (input.length > 3000) {
      return res.status(400).json({ error: "Input is too long. Limit: 3000 characters." });
    }

    const usageId = getUsageId(req, userId);
    const used = getUsageCount(usageId, "job");

    if (used >= 5) {
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage."
      });
    }

    const result = await generateText({
      system:
        "You analyze job descriptions for job seekers. Return a clear breakdown with: key responsibilities, required skills, ATS keywords, and what to emphasize in a resume or cover letter.",
      user: `Analysis focus: ${style || "balanced"}\n\nAnalyze this job description:\n${input}`,
      temperature: 0.5
    });

    incrementUsage(usageId, "job");

    return res.status(200).json({ result });
  } catch (error) {
    console.error("job-analyzer failed:", error);
    return res.status(500).json({ error: error.message || "A server error has occurred." });
  }
}
