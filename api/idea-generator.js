import { enforceUsageLimit } from "../lib/usage.js";
import { runOpenAIText } from "../lib/toolRunner.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, mode = "business", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing idea prompt." });
    }

    const usage = await enforceUsageLimit(req, userId, "idea", 5);

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
      business: `Generate practical business idea directions from this concept. Focus on usefulness, target audience, and simple execution.\n\nConcept:\n${input}`,
      content: `Generate strong content ideas from this concept. Focus on clear angles, themes, and useful directions.\n\nConcept:\n${input}`,
      creative: `Generate creative idea directions from this concept. Focus on originality, variety, and usable angles.\n\nConcept:\n${input}`,
      practical: `Generate practical and realistic idea directions from this concept. Focus on simple execution and clear next steps.\n\nConcept:\n${input}`
    };

    const result = await runOpenAIText({
      system:
        "You are a concise idea generation assistant. Return a clean list of useful ideas with short explanations where helpful.",
      userText: promptMap[mode] || promptMap.business
    });

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("Idea generator returned an empty result.");
    }

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("IDEA GENERATOR ERROR:", error);
    return res.status(500).json({
      error: error.message || "Idea generation failed."
    });
  }
}
