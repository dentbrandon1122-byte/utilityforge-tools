import { isProUser } from "../lib/proStore.js";
import { getUsageId, getUsageStatus, incrementUsage } from "../lib/usage.js";

const TOOL_KEY = "linkedin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, style, userId } = req.body || {};
    const pro = userId ? await isProUser(userId) : false;
    const usageId = getUsageId(req, userId);

    if (!pro) {
      const status = await getUsageStatus(usageId, TOOL_KEY, 5);

      if (status.used >= 5) {
        return res.status(429).json({
          error: "Daily free limit reached. Upgrade to Pro."
        });
      }

      await incrementUsage(usageId, TOOL_KEY);
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Profile details are required." });
    }

    const maxLength = pro ? 6000 : 2200;

    if (text.trim().length > maxLength) {
      return res.status(400).json({
        error: `Text must be ${maxLength} characters or fewer.`
      });
    }

    if (!process.env.OPENAI_KEY) {
      return res.status(500).json({
        error: "OPENAI_KEY is missing in environment variables."
      });
    }

    const allowedStyles = ["professional", "confident", "concise", "personalbrand"];
    const selectedStyle = allowedStyles.includes(style) ? style : "professional";

    const styleInstructions = {
      professional: "Write a polished and professional LinkedIn headline and summary.",
      confident: "Write a confident LinkedIn headline and summary with a stronger career-forward tone.",
      concise: "Write a concise LinkedIn headline and summary that are clear and efficient.",
      personalbrand: "Write a LinkedIn headline and summary that feel more distinct, memorable, and brand-driven while staying professional."
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You create LinkedIn profile copy for users. " +
              "Return the result with these exact sections:\n\n" +
              "Headline\n" +
              "Summary\n\n" +
              "Do not include extra commentary. " +
              "Make the writing sound polished, employable, and modern. " +
              styleInstructions[selectedStyle]
          },
          {
            role: "user",
            content: text.trim()
          }
        ],
        temperature: 0.5
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI request failed."
      });
    }

    const result = data?.choices?.[0]?.message?.content?.trim();

    if (!result) {
      return res.status(500).json({ error: "No result returned from OpenAI." });
    }

    return res.status(200).json({ result });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Server error."
    });
  }
}
