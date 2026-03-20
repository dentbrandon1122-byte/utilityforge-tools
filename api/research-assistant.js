import { getUsageId, getUsageStatus, incrementUsage } from "../lib/usage.js";
import { isProUser } from "../lib/proStore.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, mode = "general", userId } = req.body || {};
    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing research topic or question." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY." });
    }

    const usageId = getUsageId(req, userId);
    const pro = await isProUser(userId);
    const toolKey = "research";
    const freeLimit = 5;

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

    const trimmedInput = input.slice(0, 1800);

    const prompts = {
      general: `Give a clear, structured research response for the topic below. Keep it concise, practical, and easy to understand. Use short sections or bullet points where helpful.

Topic:
${trimmedInput}`,

      legal: `Give a structured legal research drafting overview for the issue below. Do not present anything as legal advice. Focus on issue spotting, key questions, what should be verified, and what sources should be checked next. Keep it concise and organized.

Issue:
${trimmedInput}`,

      outline: `Turn the topic below into a clean research outline with key sections, subpoints, and next-step questions. Keep it practical, clear, and concise.

Topic:
${trimmedInput}`,

      "issue-spotting": `Identify the main issues, risks, open questions, and important follow-up areas related to the topic below. Keep the result structured, practical, and concise.

Topic:
${trimmedInput}`
    };

    const userPrompt = prompts[mode] || prompts.general;

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
              content: userPrompt
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
        error: raw || "Invalid response from OpenAI."
      });
    }

    if (!response.ok) {
      return res.status(500).json({
        error: data?.error?.message || "Research assistant failed."
      });
    }

    const result =
      data?.choices?.[0]?.message?.content?.trim() ||
      "No research output returned.";

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
      remaining: "∞",
      used: 0,
      limit: "∞",
      pro: true
    });
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(200).json({
        result:
          "That request took too long. Try a shorter or more specific research question.",
        remaining: "—",
        used: 0,
        limit: "—",
        pro: false
      });
    }

    return res.status(500).json({
      error: error.message || "Research assistant failed."
    });
  }
}
