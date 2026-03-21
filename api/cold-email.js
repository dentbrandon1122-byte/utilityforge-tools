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
      return res.status(400).json({ error: "Missing cold email input." });
    }

    const usage = await enforceUsageLimit(req, userId, "cold-email", 5);

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
      professional: `Write a polished professional cold email from these notes.\n\nNotes:\n${input}`,
      friendly: `Write a polished and friendly cold email from these notes.\n\nNotes:\n${input}`,
      confident: `Write a polished and confident cold email from these notes.\n\nNotes:\n${input}`,
      concise: `Write a concise but strong cold email from these notes.\n\nNotes:\n${input}`
    };

    const result = await runOpenAIText({
      system:
        "You write effective cold emails. Keep the message clear, natural, and persuasive without sounding spammy. Return only the email.",
      userText: promptMap[mode] || promptMap.professional
    });

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("Cold email generator returned an empty result.");
    }

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("COLD EMAIL ERROR:", error);
    return res.status(500).json({
      error: error.message || "Cold email generation failed."
    });
  }
}
