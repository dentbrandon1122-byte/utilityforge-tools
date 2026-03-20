import { getUsageId, getUsageStatus, incrementUsage } from "../lib/usageStore.js";
import { isProUser } from "../lib/proStore.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    const { text, mode = "general", userId } = body;
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing research topic or question." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY." });
    }

    const usageId = getUsageId(req, userId);
    const pro = await isProUser(userId);
    const freeLimit = 5;

    if (!pro) {
      const status = getUsageStatus(usageId, "research", freeLimit);

      if (status.remaining <= 0) {
        return res.status(429).json({
          error: "Daily free limit reached. Upgrade to Pro for unlimited usage.",
          ...status,
          pro: false
        });
      }
    }

    const promptMap = {
      general: `Give a structured, concise research answer with short sections or bullet points. Keep it practical and easy to understand.

Topic:
${input}`,

      legal: `Give a structured legal research overview for the issue below. Do not present anything as legal advice. Focus on issue spotting, risks, key questions, what should be verified, and what sources to check next. Keep it concise.

Issue:
${input}`,

      outline: `Turn the topic below into a clean research outline with main sections, subpoints, and follow-up questions. Keep it practical and concise.

Topic:
${input}`,

      "issue-spotting": `Identify the main issues, risks, open questions, and follow-up areas related to the topic below. Keep it structured, practical, and concise.

Topic:
${input}`
    };

    const prompt = promptMap[mode] || promptMap.general;

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
                "You are a concise research assistant. Give structured, useful, easy-to-read results. Keep responses under 220 words. Prefer bullets and short sections over long paragraphs."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 320,
          temperature: 0.7
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
        error: data?.error?.message || "Research request failed."
      });
    }

    const result =
      data?.choices?.[0]?.message?.content?.trim() ||
      "No research output returned.";

    if (!pro) {
      incrementUsage(usageId, "research");
      const status = getUsageStatus(usageId, "research", freeLimit);

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
        result: "That request took too long. Try a shorter or more specific research question.",
        pro: false
      });
    }

    return res.status(500).json({
      error: error.message || "Research assistant failed."
    });
  }
}
