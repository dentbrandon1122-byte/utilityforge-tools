import OpenAI from "openai";
import { enforceUsageLimit } from "../lib/usage.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, tone = "concise", userId } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Missing text to summarize." });
    }

    const usage = await enforceUsageLimit(req, userId, "summarize", 5);

    if (!usage.allowed) {
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited usage.",
        pro: false,
        used: usage.used,
        remaining: usage.remaining,
        limit: usage.limit
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: `Summarize the user's text in a ${tone} style. Return a clear, readable summary only.`
        },
        {
          role: "user",
          content: text
        }
      ]
    });

    const result = response.choices?.[0]?.message?.content?.trim() || "";

    return res.status(200).json({
      result,
      pro: usage.pro,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Summarization failed."
    });
  }
}
