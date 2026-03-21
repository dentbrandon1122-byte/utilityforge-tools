import { enforceUsageLimit } from "../lib/usage.js";
import { runOpenAIText } from "../lib/toolRunner.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, mode = "professional", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing cover letter input." });
    }

    const usage = await enforceUsageLimit(req, userId, "cover-letter", 5);

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
      professional: `Write a polished professional cover letter draft from these notes.\n\nNotes:\n${input}`,
      confident: `Write a polished and confident cover letter draft from these notes.\n\nNotes:\n${input}`,
      friendly: `Write a polished and approachable cover letter draft from these notes.\n\nNotes:\n${input}`,
      concise: `Write a concise but strong cover letter draft from these notes.\n\nNotes:\n${input}`
    };

    const result = await runOpenAIText({
      system:
        "You write strong cover letter drafts. Keep the writing professional, clear, and tailored to the supplied notes. Return only the letter.",
      userText: promptMap[mode] || promptMap.professional
    });

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("Cover letter generator returned an empty result.");
    }

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("COVER LETTER ERROR:", error);
    return res.status(500).json({
      error: error.message || "Cover letter generation failed."
    });
  }
}
