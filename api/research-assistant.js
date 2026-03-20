import { enforceUsageLimit } from "../lib/usage.js";
import { runOpenAIText } from "../lib/toolRunner.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, mode = "general", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing research topic." });
    }

    const usage = await enforceUsageLimit(req, userId, "research", 5);

    if (!usage.allowed) {
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro.",
        ...usage
      });
    }

    const promptMap = {
      general: `Give a structured, concise research answer with bullet points.

Topic:
${input}`,

      legal: `Give a structured legal overview (not legal advice). Focus on issues and risks.

Issue:
${input}`,

      outline: `Create a clean research outline.

Topic:
${input}`,

      "issue-spotting": `Identify risks and key questions.

Topic:
${input}`
    };

    const prompt = promptMap[mode] || promptMap.general;

    const result = await runOpenAIText({
      system: "You are a concise research assistant. Keep responses structured and under 200 words.",
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
    console.error("RESEARCH ERROR:", error);

    return res.status(500).json({
      error: error.message || "Research assistant failed."
    });
  }
}
