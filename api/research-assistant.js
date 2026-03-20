import { isProUser } from "../lib/proStore.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { text, mode = "general", userId } = body || {};

    const input = typeof text === "string" ? text.trim() : "";

    if (!input) {
      return res.status(400).json({ error: "Missing research topic." });
    }

    // ✅ PRO CHECK
    const isPro = await isProUser(userId);

    // (Optional placeholder — replace with your real limit logic)
    const FREE_LIMIT = 5;
    let remaining = FREE_LIMIT;

    if (!isPro && remaining <= 0) {
      return res.status(429).json({
        error: "Free limit reached. Upgrade to Pro."
      });
    }

    // ✅ PROMPT MODES
    const promptMap = {
      general: `Give a structured, concise research answer with bullet points.

Topic:
${input}`,

      legal: `Give a structured legal research overview (not legal advice). Focus on key issues, risks, and what to verify.

Issue:
${input}`,

      outline: `Create a clean research outline with sections and subpoints.

Topic:
${input}`,

      "issue-spotting": `Identify risks, issues, and follow-up questions.

Topic:
${input}`
    };

    const prompt = promptMap[mode] || promptMap.general;

    // ✅ TIMEOUT PROTECTION
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
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Be concise, structured, and useful. Keep under 200 words. Use bullets when possible."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 300
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
        error: "Invalid response from AI."
      });
    }

    if (!response.ok) {
      return res.status(500).json({
        error: data?.error?.message || "AI request failed."
      });
    }

    const result =
      data?.choices?.[0]?.message?.content?.trim() ||
      "No output generated.";

    return res.status(200).json({
      result,
      pro: isPro,
      remaining: isPro ? "unlimited" : remaining - 1
    });

  } catch (error) {
    console.error("RESEARCH ERROR:", error);

    if (error.name === "AbortError") {
      return res.status(200).json({
        result: "That request took too long. Try something shorter."
      });
    }

    return res.status(500).json({
      error: "Server error. Please try again."
    });
  }
}
