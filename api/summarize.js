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
      return res.status(400).json({ error: "Missing text to summarize." });
    }

    const usage = await enforceUsageLimit(req, userId, "summary", 5);

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
      general: `Summarize this text clearly and cleanly.\n\nText:\n${input}`,
      study: `Turn this text into useful study notes with the main ideas made easy to review.\n\nText:\n${input}`,
      bullets: `Summarize this text into short bullet points.\n\nText:\n${input}`,
      concise: `Summarize this text as briefly as possible while keeping the key meaning.\n\nText:\n${input}`
    };

    const result = await runOpenAIText({
      system:
        "You summarize text clearly and efficiently. Keep the output easy to scan and useful.",
      userText: promptMap[mode] || promptMap.general
    });

    if (!result || typeof result !== "string" || !result.trim()) {
      throw new Error("Summarizer returned an empty result.");
    }

    return res.status(200).json({
      result: result.trim(),
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    console.error("SUMMARIZER ERROR:", error);
    return res.status(500).json({
      error: error.message || "Summarization failed."
    });
  }
}
