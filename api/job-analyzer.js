import { isProUser } from "../lib/proStore.js";
import { getUsageId, getUsageStatus, incrementUsage } from "../lib/usage.js";

const TOOL_KEY = "job";

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
      return res.status(400).json({ error: "Job description text is required." });
    }

    const maxLength = pro ? 8000 : 3000;

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

    const allowedStyles = ["balanced", "ats", "resume", "coverletter"];
    const selectedStyle = allowedStyles.includes(style) ? style : "balanced";

    const styleInstructions = {
      balanced: "Analyze the job description clearly and practically for a typical job seeker.",
      ats: "Focus strongly on ATS keywords, repeated phrases, hard skills, certifications, and role-specific terms.",
      resume: "Focus on what the user should emphasize in a resume to match this role.",
      coverletter: "Focus on what the user should emphasize in a cover letter to match this role."
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
              "You analyze job descriptions for job seekers. " +
              "Return a structured response with these exact sections:\n\n" +
              "1. Key Skills\n" +
              "2. ATS Keywords\n" +
              "3. What the Employer Cares About Most\n" +
              "4. Resume Focus\n" +
              "5. Cover Letter Focus\n\n" +
              "Use short bullets under each section. " +
              "Do not invent qualifications that are not in the job post. " +
              "Keep the analysis practical, readable, and directly useful. " +
              styleInstructions[selectedStyle]
          },
          {
            role: "user",
            content: text.trim()
          }
        ],
        temperature: 0.3
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
