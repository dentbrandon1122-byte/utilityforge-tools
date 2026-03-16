import { isProUser } from "../lib/proStore.js";
import { getUsageId, getUsageStatus, incrementUsage } from "../lib/usage.js";

const TOOL_KEY = "cover";

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
      return res.status(400).json({ error: "Text is required." });
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

    const allowedStyles = ["professional", "confident", "concise", "tailored"];
    const selectedStyle = allowedStyles.includes(style) ? style : "professional";

    const styleInstructions = {
      professional: "Write a polished, professional cover letter with clear structure and strong tone.",
      confident: "Write a confident cover letter that sounds strong and capable without being aggressive.",
      concise: "Write a concise cover letter that stays brief, clear, and professional.",
      tailored: "Write a cover letter that feels specifically tailored to the role and highlights the most relevant qualifications."
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
              "You write professional cover letters based on the user's background, goals, and job notes. " +
              "Write a complete cover letter with a natural professional tone. " +
              "Do not include fake company names, fake addresses, or made-up facts. " +
              "If key details are missing, keep the wording general but still polished. " +
              "Return only the cover letter text with no extra labels or commentary. " +
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
