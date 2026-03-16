import { isProUser } from "../lib/proStore.js";
import { getUsageId, getUsageStatus, incrementUsage } from "../lib/usage.js";

const TOOL_KEY = "coldemail";

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
      return res.status(400).json({ error: "Email context is required." });
    }

    const maxLength = pro ? 5000 : 2000;

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

    const allowedStyles = ["professional", "friendly", "concise", "outreach"];
    const selectedStyle = allowedStyles.includes(style) ? style : "professional";

    const styleInstructions = {
      professional: "Write a polished and professional cold email.",
      friendly: "Write a warm and friendly cold email that still feels polished.",
      concise: "Write a concise cold email that gets to the point quickly.",
      outreach: "Write a cold outreach email focused on networking, collaboration, or job interest."
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
              "You write clear, practical cold emails. " +
              "Return only the finished email with no extra labels or commentary. " +
              "Do not invent facts. " +
              "Keep it natural, useful, and ready to send. " +
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
