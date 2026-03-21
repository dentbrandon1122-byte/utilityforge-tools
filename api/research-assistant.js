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
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage.",
        pro: false,
        used: usage.used,
        remaining: usage.remaining,
        limit: usage.limit
      });
    }

    const promptMap = {
      general: `Give a structured, concise research answer with short bullet points where helpful.\n\nTopic:\n${input}`,
      legal: `Give a structured legal-style overview for this issue. Do not give legal advice. Focus on issues, risks, what should be verified, and next sources to check.\n\nIssue:\n${input}`,
      outline: `Turn this topic into a clean research outline with main sections and short subpoints.\n\nTopic:\n${input}`,
      "issue-spotting": `Identify the main issues, risks, open questions, and follow-up areas related to this topic.\n\nTopic:\n${input}`
    };

    const result = await runOpenAIText({
      system:
        "You are a concise research assistant. Be structured, practical, and easy to scan. Keep responses useful and clear.",
      userText: promptMap[mode] || promptMap.general
    });

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("Research assistant returned an empty result.");
    }

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("RESEARCH ASSISTANT ERROR:", error);
    return res.status(500).json({
      error: error.message || "Research assistant failed."
    });
  }
}
