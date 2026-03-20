import { enforceUsageLimit } from "../lib/usage.js";
import { runOpenAIText } from "../lib/toolRunner.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, mode = "ats", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing job description." });
    }

    const usage = await enforceUsageLimit(req, userId, "job", 5);

    if (!usage.allowed) {
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro.",
        ...usage
      });
    }

    const promptMap = {
      ats: `Analyze this job for ATS:
- key skills
- keywords
- what to emphasize

Job:
${input}`,

      skills: `Break down skills and responsibilities.

Job:
${input}`,

      keywords: `Extract important keywords.

Job:
${input}`,

      plain: `Summarize job clearly.

Job:
${input}`
    };

    const prompt = promptMap[mode] || promptMap.ats;

    const result = await runOpenAIText({
      system: "You are a concise job analysis assistant. Use bullets and keep under 200 words.",
      userText: prompt
    });

    return res.status(200).json({
      result,
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });

  } catch (error) {
    console.error("JOB ANALYZER ERROR:", error);

    return res.status(500).json({
      error: error.message || "Job analyzer failed."
    });
  }
}
