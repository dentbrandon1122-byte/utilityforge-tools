import { getUsageId, getUsageStatus, incrementUsage } from "../lib/usageStore.js";
import { isProUser } from "../lib/proStore.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    const { text, mode = "ats", userId } = body;
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing job description." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY." });
    }

    const usageId = getUsageId(req, userId);
    const pro = await isProUser(userId);
    const freeLimit = 5;
    const toolKey = "job";

    if (!pro) {
      const status = getUsageStatus(usageId, toolKey, freeLimit);

      if (status.remaining <= 0) {
        return res.status(429).json({
          error: "Daily free limit reached. Upgrade to Pro for unlimited usage.",
          ...status,
          pro: false
        });
      }
    }

    const promptMap = {
      ats: `Analyze the job description below for ATS alignment. Return:
- top skills
- likely ATS keywords
- what the applicant should emphasize
Keep it concise and easy to scan.

Job description:
${input}`,

      skills: `Break down the job description below into the main skills, knowledge areas, and responsibilities. Keep it concise and structured.

Job description:
${input}`,

      keywords: `Extract the most important keywords and phrases from the job description below that would matter for a resume or application. Keep it concise and structured.

Job description:
${input}`,

      plain: `Summarize the job description below in a clear, practical way. Explain what the employer seems to care about most. Keep it concise.

Job description:
${input}`
    };

    const prompt = promptMap[mode] || promptMap.ats;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let response;

    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a concise job analysis assistant. Give structured, useful, easy-to-read results. Keep responses under 220 words. Prefer bullets and short sections."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 320,
          temperature: 0.6
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(500).json({
        error: raw || "Invalid response from AI."
      });
    }

    if (!response.ok) {
      return res.status(500).json({
        error: data?.error?.message || "Job analyzer request failed."
      });
    }

    const result =
      data?.choices?.[0]?.message?.content?.trim() ||
      "No job analysis returned.";

    if (!pro) {
      incrementUsage(usageId, toolKey);
      const status = getUsageStatus(usageId, toolKey, freeLimit);

      return res.status(200).json({
        result,
        ...status,
        pro: false
      });
    }

    return res.status(200).json({
      result,
      pro: true,
      used: 0,
      remaining: "unlimited",
      limit: "unlimited"
    });
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(200).json({
        result: "That request took too long. Try a shorter or more specific job description.",
        pro: false
      });
    }

    return res.status(500).json({
      error: error.message || "Job analyzer failed."
    });
  }
}
