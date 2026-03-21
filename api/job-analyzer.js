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
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage.",
        pro: false,
        used: usage.used,
        remaining: usage.remaining,
        limit: usage.limit
      });
    }

    const promptMap = {
      ats: `Analyze this job description for ATS alignment. Return the most important skills, likely keywords, and what the applicant should emphasize.\n\nJob description:\n${input}`,
      skills: `Break this job description into the main skills, responsibilities, and knowledge areas.\n\nJob description:\n${input}`,
      keywords: `Extract the most important keywords and phrases from this job description for resume targeting.\n\nJob description:\n${input}`,
      plain: `Summarize this job description in a clear practical way and explain what the employer seems to care about most.\n\nJob description:\n${input}`
    };

    const result = await runOpenAIText({
      system:
        "You analyze job descriptions clearly. Keep the output structured, useful, and easy to scan.",
      userText: promptMap[mode] || promptMap.ats
    });

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("Job analyzer returned an empty result.");
    }

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("JOB ANALYZER ERROR:", error);
    return res.status(500).json({
      error: error.message || "Job analysis failed."
    });
  }
}
